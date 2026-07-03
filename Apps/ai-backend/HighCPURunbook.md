# AI Backend — High CPU Runbook
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Audience:** on-call engineers operating `Apps/ai-backend`
**Date:** 2026-07-03

---

## Signal

- Host-level: `docker stats ai-backend` shows sustained CPU near/at the container's limit (no CPU limit is currently set in `docker-compose.production.yml` — see Known gaps).
- Application-level: `HighAPILatency` alert firing (p95 `http_request_duration_seconds` > 1s for 5m) with no corresponding Mongo/Redis latency spike on the dashboard's DB/Redis rows — this pattern points at CPU/event-loop contention in the Node process itself, not a downstream dependency.

## Triage

```bash
docker stats ai-backend --no-stream
docker compose -f docker-compose.production.yml logs --tail=200 ai-backend
```

1. **Correlate with the Grafana dashboard** (`ai-backend-overview.json`, row 1 "HTTP"): is latency elevated across *all* routes, or one specific route? A single hot route points at an expensive handler (heavy validation, a large synchronous loop, unbounded JSON serialization); an across-the-board rise points at something global (GC pressure, an infinite/tight loop somewhere in shared middleware).
2. **Rule out downstream causes first**: check the Mongo/Redis latency rows on the same dashboard. If those are also elevated, this is not a CPU-bound incident — see `ObservabilityRunbook.md#high-api-latency` instead.
3. **Check traffic volume**: is this proportional load growth (capacity problem) or a spike (possible abusive client / retry storm)? `http_requests_total` rate by route.
4. **Check for a stuck event loop**: if `/health` itself is slow to respond (it should be near-instant, no dependency checks), the Node event loop is blocked — this is the strongest CPU-incident signal.

## Mitigation

| Cause | Action |
|---|---|
| Sustained proportional growth (real traffic increase) | Scale `ai-backend` horizontally (no built-in autoscaling — this is a manual `docker compose up -d --scale ai-backend=N` plus an nginx upstream block update; not currently automated, see Known gaps). |
| Traffic spike from a small number of clients | Identify via request logs/route+status distribution; consider a temporary rate-limit tightening (existing global limiter is 30 req/min per `SecurityRunbook.md` — abusive clients past that should already be throttled; investigate why they aren't if CPU is still climbing). |
| A specific route regressed after a deploy | Roll back (`../../RollbackProcedure.md`) rather than root-causing under live load. |
| GC pressure / memory churn manifesting as CPU | Cross-check `HighMemoryRunbook.md` — the two often co-occur. |

## Recovery validation

```bash
cd Infrastructure/scripts
./post-deploy-verify.sh
```
Confirm p95 latency on the dashboard returns under the `HighAPILatency` threshold (1s) and stays there for at least one full alert evaluation window (5m) before closing the incident.

## Known gaps

- No container-level CPU/memory limits are set in `docker-compose.production.yml` — a runaway process can consume the whole host rather than being contained to its own container. Recommend adding `deploy.resources.limits` (or the Compose v2 `cpus`/`mem_limit` shorthand) before Closed Beta.
- No horizontal autoscaling — scaling `ai-backend` today is a manual operator action, and nginx's upstream block would need a matching manual edit (nginx.conf is not currently templated for a variable instance count).
- Node process CPU/heap metrics (`process_cpu_seconds_total`, event-loop-lag) are not currently exported to `/metrics` — `prom-client`'s default Node.js metrics collector is not wired up in `metrics.service.ts` today, only the application-defined counters/histograms are. This is a real observability gap for exactly this failure mode; tracked in `OperationsReadinessReview.md`.
