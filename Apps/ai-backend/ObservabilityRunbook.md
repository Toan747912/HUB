# AI Backend — Observability Runbook
**Batch:** 8 — Production Observability Platform
**Audience:** on-call engineers operating `Apps/ai-backend`

---

## Where things live

| Signal | Where | How to access |
|---|---|---|
| Metrics | `GET /metrics` (Prometheus text format) | `curl http://<host>:<port>/metrics` |
| Traces | Console span exporter (stdout) + in-memory exporter used by tests | Grep application logs for `resource:` / `traceId:` blocks; wire an OTLP exporter for a real backend (see "Extending" below) |
| Structured logs | stdout, one JSON line per HTTP request / infra operation | Standard log aggregation (whatever ingests this process's stdout) |
| Audit trail | MongoDB `audit_events` collection | Query by `resource` (e.g. `Goal:<goalId>`) or `traceId` |
| Health | `GET /health` (liveness), `GET /readiness` (dependency checks) | Standard k8s-style probes |
| Dashboard definition | `src/infrastructure/observability/dashboards/ai-backend-overview.json` | Import into Grafana |
| Alert rules | `src/infrastructure/observability/alerts/ai-backend-alerts.yml` | Load into Prometheus/Alertmanager |

Every HTTP response carries an `x-trace-id` header — use it to correlate a user-reported
issue with logs, traces, and (if the mutation was a Goal command) the audit trail.

---

## Reading the dashboard

The dashboard has 6 rows, top to bottom:

1. **HTTP** — request rate by route/status, p95 latency by route. Start here for
   "the API feels slow" reports.
2. **MongoDB** — dependency-up stat + p95 latency by operation (`save`, `findById`,
   `findAll`, `delete`). A latency spike here usually means the API latency spike (row 1)
   is downstream of the database.
3. **Redis** — dependency-up stat + p95 latency by operation (`ping`, `lock`, `unlock`).
4. **BullMQ** — dependency-up stat, job outcome rate (`enqueued`/`processed`/
   `failed`/`dead_lettered`), and queue delay p95 (time a job waits before a worker
   picks it up — a fast-growing number here means the worker pool is saturated or
   Redis is degraded).
5. **Outbox** — pending row count (should hover near 0; the relay sweeps every 10s) and
   circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN) per job key.
6. **Goal Module** — business throughput: goals created/completed per second.

---

## Alert response procedures

### Redis unavailable
`service_dependency_up{dependency="redis"} == 0` for 2 minutes.

- **Impact:** distributed locking becomes a no-op (falls back to single-instance
  behavior — safe but non-distributed), the shared circuit breaker can't coordinate
  across instances, BullMQ enqueue/processing stops (events pile up in the outbox
  instead, not lost).
- **Check:** `docker ps` / your Redis host — is the process actually down, or is it a
  network partition between `ai-backend` and Redis?
- **Mitigation:** restart/reconnect Redis. No data loss risk — the outbox durability
  guarantee (Batch 7) means events queue up in MongoDB and drain automatically via
  `OutboxRelayService` once Redis recovers.

### Mongo disconnected
`service_dependency_up{dependency="mongodb"} == 0` for 1 minute.

- **Impact:** critical — all Goal persistence and outbox writes fail. This is a
  hard-down condition for the Goal module.
- **Check:** MongoDB process/cluster health, connection string validity, network
  reachability from the app host.
- **Mitigation:** restore MongoDB connectivity. The app does not auto-restart the
  connection pool beyond Mongoose's built-in retry — verify `/readiness` returns 200
  after MongoDB recovers; if not, restart the `ai-backend` process.

### BullMQ stalled jobs
p95 `bullmq_queue_delay_ms` > 30s for 5 minutes.

- **Impact:** goal-events processing is falling behind; downstream consumers of the
  queue (once wired to a real event publisher) see delayed data.
- **Check:** Redis health, worker process count/CPU, `bullmq_jobs_total{status="failed"}`
  rate (are jobs retrying repeatedly and clogging the queue?).
- **Mitigation:** scale worker capacity, investigate repeated job failures (check
  structured logs for the failing `eventType`/`errorCode`).

### Outbox backlog high
`outbox_pending_total > 100` for 5 minutes.

- **Impact:** events are durable (no loss) but delivery is delayed.
- **Check:** is Redis/BullMQ actually down (see above), or is the relay sweep itself
  failing? Check logs for `outbox_relay_failed` entries.
- **Mitigation:** resolve the underlying Redis/BullMQ issue; the relay will drain the
  backlog automatically once enqueue succeeds again. If the backlog is due to a genuine
  event-volume spike rather than an outage, this may be expected — confirm before
  escalating.

### Circuit breaker OPEN
`circuit_breaker_state == 1` for 1 minute.

- **Impact:** job processing for the labeled `job` key is currently being refused
  (fail-fast) to protect against a cascading failure.
- **Check:** what was failing before the breaker opened? Check
  `bullmq_jobs_total{status="failed"}` and structured logs for the same `eventType`
  around the time the breaker tripped.
- **Mitigation:** fix the root cause of the failures; the breaker auto-transitions to
  HALF_OPEN after a 30s cooldown and will re-close on the next success.

### High API latency
p95 `http_request_duration_seconds` > 1s for 5 minutes, by route.

- **Check:** correlate with the MongoDB/Redis latency panels — is this a downstream
  dependency issue or application-level (check for goroutine/event-loop blocking,
  validation pipeline overhead, etc.)?
- **Mitigation:** route-specific; use the `route` label to isolate which endpoint is
  degraded.

### High error rate
5xx / total request ratio > 5% for 5 minutes.

- **Check:** structured logs filtered by `status: "FAILURE"` and `errorCode` to identify
  the dominant error type; cross-reference with the Mongo/Redis dependency-up gauges.
- **Mitigation:** depends on `errorCode` — validation errors (`BadRequestException`)
  are a client-side signal, not an incident; `ServiceUnavailableException`/`Error` at
  volume indicates a real dependency outage (see the relevant alert above).

---

## Extending observability (documented gaps)

- **OTLP export:** `TracerService` currently exports spans to console + in-memory only
  (no live collector was available in the build environment). To wire a real backend
  (Jaeger, Tempo, Honeycomb, etc.): add `@opentelemetry/exporter-trace-otlp-http`,
  construct an `OTLPTraceExporter({ url: getTelemetryConfig().otlpEndpoint })`, and add
  it as a third `SimpleSpanProcessor`/`BatchSpanProcessor` in `tracer.service.ts`'s
  `onModuleInit()`. No other code changes needed — every span already carries the
  correct attributes.
- **Grafana:** import `dashboards/ai-backend-overview.json` directly; it uses standard
  Prometheus datasource queries with no environment-specific IDs to edit besides the
  datasource UID Grafana assigns on import.
- **Prometheus/Alertmanager:** load `alerts/ai-backend-alerts.yml` as a rule file; each
  alert's `annotations.runbook` links back to the section above by anchor.
