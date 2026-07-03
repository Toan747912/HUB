# AI Backend — Application Crash Runbook
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Audience:** on-call engineers operating `Apps/ai-backend`
**Date:** 2026-07-03

---

## Signal

- `docker compose ps` shows `ai-backend` as `restarting`, `unhealthy`, or `exited`.
- `GET /health` (liveness) stops responding or returns non-200.
- The `ai-backend` healthcheck in `docker-compose.production.yml` (`node -e ... /health`, 15s interval, 5 retries, 20s start period) has failed enough consecutive times for Compose/Docker to mark the container unhealthy.
- User-visible: 502/504 from `nginx` (upstream `ai-backend` unreachable).

## Triage

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=200 ai-backend
```

| Observation | Likely cause | Next step |
|---|---|---|
| Process exits immediately on start, logs show a stack trace at boot | Bad config/env var, fail-fast secret check tripped (`JWT_SECRET`/`REFRESH_SECRET`/`MONGODB_URI` missing — see `SecretsManagementGuide.md`) | Fix `.env`, redeploy. Do not loop-restart blindly; a fail-fast boot error is a config problem, not a transient one. |
| Process runs, then dies under load or after a period | OOM kill (check `docker inspect ai-backend --format '{{.State.OOMKilled}}'`), unhandled exception in a request handler | See `HighMemoryRunbook.md` if OOM-killed. Otherwise grep structured logs for the exception around the crash timestamp. |
| Process alive but `/health` times out | Event-loop blocking (synchronous CPU-heavy work, a hung downstream call with no timeout) | See `HighCPURunbook.md`. Check for a hung Mongo/Redis call — cross-reference `/readiness` and the dependency-up gauges. |
| Container stuck in `restarting` in a tight loop | Crash-on-boot repeating | Same as row 1 — a restart loop with `restart: unless-stopped` will not self-resolve a config error. Stop the loop by fixing root cause, not by disabling the healthcheck. |

## Containment

1. If this started right after a deploy: **roll back first**, investigate second — see `../../RollbackProcedure.md`. Restoring service takes priority over root-causing while users are impacted.
2. If not deploy-related, force a clean restart while you investigate:
   ```bash
   docker compose -f docker-compose.production.yml up -d --force-recreate ai-backend
   ```
   Stateless container — no data implications (per `DisasterRecoveryGuide.md` scenario 3).
3. Confirm recovery: `./Infrastructure/scripts/post-deploy-verify.sh`.

## Root-cause evidence to collect before closing the incident

- `docker compose logs ai-backend` around the crash window (save a copy — container logs are not retained indefinitely).
- `docker inspect ai-backend --format '{{.State.OOMKilled}} {{.State.ExitCode}} {{.State.Error}}'`.
- The `x-trace-id` of the last successful request before the gap, if a user report pinpoints one — use it to pull the matching audit/log entries (`ObservabilityRunbook.md`).

## Known gaps

- No crash-loop alert exists yet in `src/infrastructure/observability/alerts/ai-backend-alerts.yml` — today, a crash loop is only visible via `HighErrorRate`/`RedisUnavailable`/`MongoDisconnected` symptoms or manual `docker compose ps`. Adding a `ContainerRestartingTooOften` alert (based on container restart count, not currently exported as a Prometheus metric) is a recommended follow-up, tracked in `OperationsReadinessReview.md`.
- No centralized log aggregation — logs are stdout-only per `ObservabilityRunbook.md`; a host restart or `docker system prune` can lose crash evidence if not captured promptly.
