# Monitoring Certification — AI Mentor OS (Apps/ai-backend)
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Date:** 2026-07-03
**Builds on:** `Apps/ai-backend/ObservabilityCertificationChecklist.md` (Batch 8, 2026-07-02) — this document re-verifies that certification's conclusions against the current codebase and reframes them explicitly as **design/code certified vs. live-infrastructure certified**, per WP-06 §4.

---

## 1. What "verified monitoring" means here

Two distinct claims, not to be conflated:

- **Design-certified**: the code correctly produces metrics/traces/logs/alert-rule definitions, proven by unit/integration tests and a live boot smoke test in a sandboxed environment.
- **Live-infrastructure-certified**: a real Prometheus is actually scraping `/metrics`, a real Grafana is actually rendering the dashboard, a real Alertmanager is actually routing a real firing alert to a real human. **None of this exists yet** — confirmed by direct inspection of this repository (no Prometheus/Grafana/Alertmanager config, container, or deployment target found anywhere in `docker-compose*.yml`, `Infrastructure/`, or `.github/workflows/`).

Every row below is marked with which claim it satisfies.

## 2. Application availability

- **Design-certified:** `GET /health` (liveness, no dependency checks) and `GET /readiness` (503 with a per-dependency `checks` breakdown if Mongo/Redis/BullMQ unreachable) — `src/health/health.controller.ts`.
- **Live-certified:** the `ai-backend` service healthcheck in `docker-compose.production.yml` (`/health`, 15s interval, 5 retries) is real and running in any actual deployment of that compose file — this is the one signal in this document that is genuinely live today, since it's a Docker feature, not a Prometheus/Grafana one.

## 3. Latency

- **Design-certified:** `http_request_duration_seconds` histogram, `HighAPILatency` alert rule (p95 > 1s for 5m by route) — `metrics.service.ts`, `ai-backend-alerts.yml`.
- **Live-certified:** **NOT MET.** No Prometheus is scraping `/metrics`; the alert rule cannot fire anywhere until one is deployed and loaded with this rule file.

## 4. Error rate

- **Design-certified:** `http_requests_total{status=~"5.."}` ratio, `HighErrorRate` alert (>5% for 5m) — same files as above.
- **Live-certified:** **NOT MET**, same reason.

## 5. Queue depth

- **Design-certified:** `bullmq_queue_delay_ms`, `bullmq_jobs_total{status}` (enqueued/processed/failed/dead_lettered), `outbox_pending_total`, `BullMQStalledJobs` + `OutboxBacklogHigh` alerts.
- **Live-certified:** **NOT MET.**

## 6. Database connectivity (MongoDB)

- **Design-certified:** `service_dependency_up{dependency="mongodb"}`, `MongoDisconnected` alert (1m), plus `/readiness`'s direct connectivity check (independent of Prometheus).
- **Live-certified — partially met**: `/readiness` is a real, live check in any running deployment (Docker-level, not Prometheus-dependent). The Prometheus alert itself is not live-certified.

## 7. Redis connectivity

- **Design-certified:** `service_dependency_up{dependency="redis"}`, `RedisUnavailable` alert (2m), `/readiness`'s Redis check.
- **Live-certified — partially met**, same pattern as §6: `/readiness` is live; the alert is not.

## 8. CPU

- **Design-certified: NOT MET.** No CPU metric (process or container) is exported anywhere in `src/infrastructure/observability/`. Confirmed by inspection: no `collectDefaultMetrics()` call from `prom-client` exists in `metrics.service.ts`, and no cAdvisor/node-exporter is present in any compose file.
- **Live-certified: NOT MET.**
- This is a real, previously-undocumented-at-this-specificity gap surfaced during WP-06 — see `HighCPURunbook.md` Known gaps.

## 9. Memory

- **Design-certified: NOT MET**, same reason as CPU — no process/container memory metric exported.
- **Live-certified: NOT MET.**
- See `HighMemoryRunbook.md` Known gaps.

## 10. Disk

- **Design-certified: NOT MET.** No disk-usage metric exists anywhere in this stack (application or infrastructure level).
- **Live-certified: NOT MET.**
- See `DiskFullRunbook.md` Known gaps — this is called out as the least-covered resource dimension in the entire monitoring surface.

## 11. Container health

- **Design-certified / Live-certified — MET for what Docker itself provides**: every service in `docker-compose.production.yml` (`mongo`, `redis`, `ai-backend`) has a `healthcheck` block, and `depends_on: condition: service_healthy` gates startup order on them (`frontend` has no healthcheck of its own but depends on `ai-backend`'s). `docker compose ps` surfaces this live, today, without any additional infrastructure.
- **Not covered:** container-level resource limits/OOM visibility beyond what `docker inspect`/`docker stats` provide manually (no automated alerting on container restart counts — see `ApplicationCrashRunbook.md` Known gaps).

## 12. Alert routing, acknowledgement, escalation

- **NOT MET at any level.** `ai-backend-alerts.yml` defines `severity` labels and `runbook` annotation links (verified: every rule has both, per `ObservabilityCertificationChecklist.md` §5.8), which is the correct *input* to a routing system — but no Alertmanager configuration, notification channel (email/Slack/PagerDuty), on-call schedule, or acknowledgement mechanism exists anywhere in this repository. This is the largest single gap in the entire monitoring surface and directly blocks meaningful use of the alert rules that already exist.

## 13. Certification summary

| Dimension | Design-certified | Live-infra-certified |
|---|---|---|
| Application availability | ✅ | ✅ (health checks only; alerting not live) |
| Latency | ✅ | ❌ |
| Error rate | ✅ | ❌ |
| Queue depth | ✅ | ❌ |
| Database connectivity | ✅ | 🟡 partial (`/readiness` only) |
| Redis connectivity | ✅ | 🟡 partial (`/readiness` only) |
| CPU | ❌ | ❌ |
| Memory | ❌ | ❌ |
| Disk | ❌ | ❌ |
| Container health | ✅ | ✅ (Docker-native only) |
| Alert routing/ack/escalation | ❌ | ❌ |

**Verdict: design layer is strong and well-tested (matches the 78/81 result in `ObservabilityCertificationChecklist.md`); live-operational monitoring does not exist.** No dashboard has ever been viewed in a running Grafana, no alert has ever fired in a running Alertmanager, and CPU/memory/disk have no metrics path at all, design or live. This gap is treated as a **blocking item** for Closed Beta in `GoLiveApproval.md` — a Closed Beta with real users and no live alerting is operating blind between manual checks.

## 14. Path to closing this gap (not implemented, scoped here for planning)

1. Stand up Prometheus + Grafana + Alertmanager (or a managed equivalent) pointed at the deployment host.
2. Load `src/infrastructure/observability/alerts/ai-backend-alerts.yml` into Prometheus; configure Alertmanager routing to at least one real notification channel.
3. Import `src/infrastructure/observability/dashboards/ai-backend-overview.json` into Grafana.
4. Add `prom-client`'s `collectDefaultMetrics()` (or a `node_exporter`/cAdvisor sidecar) to close the CPU/memory/disk gap — the highest-value single change, since it's currently a 0% coverage dimension at the design level, not just the live level.
5. Re-run this certification once live infrastructure exists, updating every "❌"/"NOT MET" row with actual evidence, not a plan.
