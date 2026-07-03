# AI Backend — High Memory Runbook
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Audience:** on-call engineers operating `Apps/ai-backend`
**Date:** 2026-07-03

---

## Signal

- `docker stats ai-backend` shows RSS climbing steadily and not returning to baseline between request bursts (a classic leak signature vs. a sawtooth GC pattern, which is normal).
- Container OOM-killed: `docker inspect ai-backend --format '{{.State.OOMKilled}}'` returns `true` after a crash — see `ApplicationCrashRunbook.md`, this is one of its listed causes.
- `mongo`/`redis` containers can independently run out of memory (unbounded MongoDB working set, or Redis with no `maxmemory` policy set — check `docker-compose.production.yml`, neither is currently capped).

## Triage

```bash
docker stats --no-stream
docker inspect ai-backend --format '{{.State.OOMKilled}} {{.State.ExitCode}}'
docker compose -f docker-compose.production.yml logs --tail=200 ai-backend
```

1. **Distinguish leak vs. legitimate working-set growth**: does memory climb monotonically over hours/days regardless of load (leak), or does it track request volume and plateau (normal, possibly just needs a higher limit)?
2. **Check for an unbounded in-memory structure**: the OpenTelemetry `TracerService` currently uses an in-memory span exporter (`ObservabilityRunbook.md` — "used by tests"); confirm it is not also active/accumulating in the production build (it should only be wired for the console + in-memory exporters used by tests, not a long-lived production accumulation buffer — verify `tracer.service.ts`'s `onModuleInit()` if this is suspected).
3. **Check Mongo/Redis memory separately** — a leak in `ai-backend` does not explain `mongo`/`redis` containers growing; if those are the ones under pressure, this is a database-sizing issue, not an application memory leak.

## Mitigation

| Cause | Action |
|---|---|
| Confirmed application-level leak | Roll back to the last known-good version if this started after a deploy (`../../RollbackProcedure.md`); otherwise restart to recover immediately (`docker compose -f docker-compose.production.yml up -d --force-recreate ai-backend`) and file the leak as a bug — a restart is containment, not a fix. |
| Redis growing unbounded | Redis has no `maxmemory`/eviction policy configured today (Known gaps below) — set one (`maxmemory` + `maxmemory-policy allkeys-lru` is a reasonable default for a cache/queue broker) rather than repeatedly restarting. |
| Mongo working set growth | Expected for a growing dataset; only actionable if it exceeds host capacity — plan a host resize or index/query review, not an emergency mitigation. |
| Host genuinely out of memory (not one container's fault) | Check `free -h` on the host; identify the actual top consumer with `docker stats` before acting — do not restart services blindly. |

## Recovery validation

```bash
cd Infrastructure/scripts
./post-deploy-verify.sh
```
Watch `docker stats` for at least one full traffic cycle after mitigation to confirm memory has stabilized, not just dropped momentarily from the restart.

## Known gaps

- No container-level memory limits (`mem_limit`/`deploy.resources.limits`) are set on any service in `docker-compose.production.yml` — the host's OOM killer, not Docker's per-container limit enforcement, is the only backstop today. This means one runaway container can starve the others (e.g. `ai-backend` leaking memory could get `mongo` OOM-killed instead of itself, if `mongo`'s working set happens to be the largest resident set at the moment the host runs out). Recommend setting explicit memory limits on all four services before Closed Beta.
- Redis has no `maxmemory` policy configured (confirmed in `docker-compose.production.yml` — no `--maxmemory`/`--maxmemory-policy` flags on the `redis-server` command).
- No memory-usage alert exists in `ai-backend-alerts.yml` today — this failure mode is currently only caught reactively (OOM kill → crash → `ApplicationCrashRunbook.md`), not proactively. Process-level memory metrics are not exported to `/metrics` (same gap noted in `HighCPURunbook.md` — `prom-client`'s default Node.js metrics collector is not wired up).
