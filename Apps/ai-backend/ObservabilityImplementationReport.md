# Production Observability Platform — Implementation Report
**Batch:** 8 — Production Observability Platform
**Date:** 2026-07-02
**Strategy:** OpenTelemetry tracing + Prometheus metrics + unified structured logging + Mongo-backed audit log + Grafana dashboards + Prometheus alert rules
**Classification (input):** READY_FOR_DISTRIBUTED_EXECUTION (Conditional)

---

## Objective

Add a complete observability layer to `Apps/ai-backend` — tracing, metrics, structured
logging, audit logging, dashboards, alerting, SLO tracking — **without touching Domain,
Application, business logic, or controller/repository contracts.**

---

## Architectural Approach

Batch 8's constraint is stricter than Batch 7's: no Application-layer changes at all
(Batch 7 allowed one optional constructor param on `GoalCommandService`). This ruled out
emitting `goal_created_total`/`goal_completed_total` or audit entries from inside
`GoalCommandService`.

**Key insight:** `OutboxPublisherService` (infrastructure, implements the untouched
`IEventPublisher` contract) already receives every fully-formed `GoalDomainEvent` —
`type`, `aggregateId`, `payload` — from `GoalCommandService`. Hooking metrics and audit
logging there is 100% infrastructure work with zero Application/Domain touches, and it
already fires for every mutation.

**Cross-cutting request context** (`traceId`, `spanId`, `userId`) needed deep inside
infrastructure calls (without threading new parameters through Application method
signatures) uses Node's `AsyncLocalStorage` via a new `RequestContextService`, populated
once at the HTTP edge by a new global interceptor.

**All new infrastructure dependencies are optional constructor parameters** — the same
pattern Batch 7 established for `GoalCommandService`'s `IGoalLock`. Every existing
Batch 6/7 test (`new MongoGoalRepository(model)`, `new RedisService()`, etc.) still
constructs these classes exactly as before; none needed modification.

---

## Files Created

### `src/infrastructure/observability/`
| File | Purpose |
|---|---|
| `telemetry.config.ts` | Reads `OTEL_SERVICE_NAME` (default `ai-backend`), `OTEL_EXPORTER_OTLP_ENDPOINT` (currently informational — see Known Gaps) |
| `tracer.service.ts` | `TracerService` — `NodeTracerProvider` with dual span processors (in-memory, inspectable/testable + console, production log stream); `startSpan`/`withSpan` (auto ERROR status + exception recording on throw); `getCurrentTraceContext()`; `extractContextFromHeaders()` (manual W3C `traceparent` parser) |
| `span.factory.ts` | `SpanFactory.attributesFor({operation, aggregateId, ...})` — standardized attribute bag used at every instrumented call site |
| `request-context.ts` / `request-context.service.ts` | `AsyncLocalStorage<RequestContext>`-backed `RequestContextService.run()`/`.get()` |
| `structured-logger.service.ts` | `StructuredLoggerService.log()` — merges `timestamp`, `traceId`/`spanId` (from `TracerService`), `userId` (from `RequestContextService`) with caller-supplied `operation/aggregateId/latencyMs/status/errorCode` into one JSON line |
| `metrics.service.ts` | `MetricsService` — `prom-client` `Registry` with all 9 spec'd metrics + `bullmq_queue_delay_ms` (Queue Delay SLO) + `service_dependency_up` (dependency health for alerting) |
| `metrics.controller.ts` | `GET /metrics` — refreshes dependency-up gauges from existing `DatabaseHealthService`/`RedisHealthService`/`QueueService.isReady()` (read-only reuse) just before serializing |
| `observability-http.interceptor.ts` | New global interceptor: extracts `traceparent`, runs the request inside `RequestContextService.run()` + a root span, records HTTP metrics, logs via `StructuredLoggerService` |
| `telemetry.module.ts` | `@Global()` module wiring the above, imports `HealthModule`/`QueueModule` for `MetricsController` |
| `dashboards/ai-backend-overview.json` | Grafana dashboard — 6 rows (HTTP, MongoDB, Redis, BullMQ, Outbox, Goal Module) |
| `alerts/ai-backend-alerts.yml` | Prometheus alert rules — 7 rules (6 spec'd + `HighErrorRate`) |

### `src/infrastructure/audit/`
| File | Purpose |
|---|---|
| `audit-event.schema.ts` | Mongoose schema: `traceId, userId, operation, resource, before, after, timestamp`, collection `audit_events` |
| `audit-log.repository.ts` | `AuditLogRepository.record()`/`.findByResource()` |
| `audit-log.service.ts` | `AuditLogService.recordFromDomainEvent(event)` — maps a `GoalDomainEvent` to an audit row (`resource = 'Goal:'+aggregateId`, `operation = event.type`, `after = event.payload`, `before = null`) |
| `audit.module.ts` | — |

---

## Files Modified (infrastructure only — verified no Domain/Application/Controller-contract touches)

All new constructor params are **optional**; every pre-existing test still constructs
these classes with their original argument lists.

| File | Change |
|---|---|
| `infrastructure/persistence/repositories/mongo-goal.repository.ts` | Optional `TracerService`/`MetricsService`; every op wrapped in a `mongodb.<op>` span + `mongodb_latency_ms` recorded, success and failure paths both |
| `infrastructure/cache/redis.service.ts` | Optional `MetricsService`; `redis_latency_ms{operation="ping"}` recorded |
| `infrastructure/locks/goal-lock.service.ts` | Optional `TracerService`/`MetricsService`; `redis.lock`/`redis.unlock` spans + latency |
| `infrastructure/jobs/queue.service.ts` | Optional `TracerService`/`MetricsService`; `bullmq.enqueue` span; `bullmq_jobs_total{status}` at all 4 existing log sites; `bullmq_queue_delay_ms` from `Date.now() - job.timestamp` |
| `infrastructure/resilience/redis-circuit-breaker.service.ts` | Optional `MetricsService`; `circuit_breaker_state` gauge set on every state transition |
| `infrastructure/outbox/outbox.repository.ts` | Optional `TracerService`; `outbox.saveMany`/`outbox.findPending` spans |
| `infrastructure/outbox/outbox-publisher.service.ts` | Optional `TracerService`/`MetricsService`/`AuditLogService`; `outbox.publishMany` span; `goal_created_total`/`goal_completed_total` by `event.type`; `auditLog.recordFromDomainEvent()` per event (best-effort, never fails the publish) |
| `infrastructure/outbox/outbox-relay.service.ts` | Optional `MetricsService`; `outbox_pending_total` set from the `findPending()` result already computed in `relayPending()` |
| `infrastructure/outbox/outbox.module.ts` | Imports `AuditModule` (needed — `AuditModule` is not `@Global`, unlike `TelemetryModule`) |
| `health/health.module.ts` | Added `exports: [DatabaseHealthService, RedisHealthService]` so `MetricsController` can reuse them read-only |
| `app.module.ts` | Imports `TelemetryModule`, `AuditModule` (additive) |
| `main.ts` | `app.useGlobalInterceptors(new TraceLoggingInterceptor(), app.get(ObservabilityHttpInterceptor))` — both interceptors run; nothing removed |
| `package.json` | Added `prom-client`, `@opentelemetry/api`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, `js-yaml` |

No changes to: `domain/**`, `application/**`, `goal.controller.ts`, DTOs, response
mapper, `IGoalRepository`, `IEventPublisher`, `goal.module.ts` (constructor params on
`MongoGoalRepository`/`GoalLockService` resolve automatically via Nest DI reflection
since `TracerService`/`MetricsService` are concrete `@Global` classes — no factory/token
wiring needed, unlike Batch 7's `IGoalLock` interface which required an explicit
`useExisting` binding).

---

## Every Span Carries the Required Attributes

Verified via `tracer.service.spec.ts`: every span created through `withSpan()` /
`SpanFactory.attributesFor()` carries `operation` and `aggregateId` (when applicable) as
attributes, and `traceId`/`spanId`/`parentSpanId` are intrinsic to the OTel span context
itself (readable via `span.spanContext()` and `span.parentSpanContext`).

```json
{
  "name": "HTTP POST /goal",
  "traceId": "acf2b17526995da9d4d78cbde8903635",
  "id": "48ff19545e87de84",
  "attributes": { "operation": "POST /goal", "http.method": "POST", "http.route": "/goal" }
}
```
(Captured live from the console span exporter during the boot smoke test below.)

---

## Runtime Evidence

### Type check
```
npx tsc -p tsconfig.build.json --noEmit
```
Result: **0 errors.**

### Build
```
npx tsc -p tsconfig.build.json
```
Result: succeeds, `dist/` regenerates including all new `infrastructure/observability`
and `infrastructure/audit` modules.

### Test suite
```
npx jest --config jest.config.js --forceExit
```
Result: **27 suites / 121 tests — all PASS** (75 pre-existing from Batches 6–7,
unmodified and still green; 46 new for Batch 8).

New suites:

| Suite | Tests | Covers |
|---|---|---|
| `tracer.service.spec.ts` | 8 | init, parent/child spans, attributes, error status, traceparent extraction |
| `request-context.service.spec.ts` | 4 | AsyncLocalStorage isolation across concurrent async ops |
| `structured-logger.service.spec.ts` | 5 | all required fields, SUCCESS→log/FAILURE→error routing, traceId/spanId/userId sourcing |
| `metrics.service.spec.ts` | 5 | all 9 metric names present, counter/gauge correctness, per-instance isolation |
| `metrics.controller.spec.ts` | 2 | dependency-up gauges refreshed from live health services |
| `observability-http.interceptor.spec.ts` | 5 | HTTP metrics, structured logs, userId capture, error path, traceparent propagation |
| `audit-log.repository.spec.ts` | 3 | Mongo persistence (mongodb-memory-server), ordering, userId default |
| `audit-log.service.spec.ts` | 3 | event→audit mapping, honest `before: null`, userId from request context |
| `alerts.spec.ts` | 8 | YAML parses, all 6 required alerts present, severity/runbook annotations |
| `dashboards.spec.ts` | 8 | JSON parses, all 6 required rows present, every panel expr references a real metric |
| 7 × `*.metrics.spec.ts` / `*.tracing.spec.ts` | 20 | optional-param wiring verified per infrastructure class, backward compatibility confirmed |

### Boot check + end-to-end smoke test
Booted `dist/main.js` against an in-memory MongoDB, no `REDIS_HOST`/OTLP endpoint set:

```
GET /health     → 200 {"status":"ok"}
GET /readiness  → 200 {"database":"connected","redis":"not_configured","bullmq":"not_configured"}
GET /metrics (before) → contains goal_created_total: true

POST /goal (valid payload, Authorization header) → 201

GET /metrics (after) → goal_created_total 1
                        http_requests_total{method="POST",route="/goal",status="201"} 1
```

Direct MongoDB check confirmed the audit row:
```json
{
  "traceId": "0bd5d113-b7a4-4ec8-9237-451238d6fe24",
  "userId": null,
  "operation": "GoalCreated",
  "resource": "Goal:abbc79ef-7d78-4bff-98db-c628f0aecea6",
  "before": null,
  "after": { "learnerId": "...", "status": "DRAFT", "title": "Audit check goal" },
  "timestamp": "2026-07-02T04:36:37.096Z"
}
```

This confirms the full chain: `GoalCommandService` (untouched) → `OutboxPublisherService`
(infrastructure) → `MetricsService.incrementGoalCreated()` + `AuditLogService` write, all
without a single Application/Domain file change.

---

## Known Gaps

- **OTLP export not wired.** `telemetry.config.ts` reads `OTEL_EXPORTER_OTLP_ENDPOINT`
  but `TracerService` currently only registers in-memory + console span processors — no
  live OTLP collector/Jaeger exists in this sandbox to validate against. Adding
  `@opentelemetry/exporter-trace-otlp-http` and a third `BatchSpanProcessor` is a drop-in
  addition once a collector endpoint is confirmed reachable (documented further in
  `ObservabilityReadinessReview.md`).
- **Grafana/Prometheus not live.** The dashboard JSON and alert rules YAML are certified
  by parsing + structural assertions (valid JSON/YAML, correct metric references,
  required sections/alerts present) — not by importing into a running Grafana/Prometheus
  instance, since neither is available in this sandbox.
- **Auto-instrumentation not used.** HTTP/Mongo/Redis/BullMQ instrumentation is manual
  (explicit `withSpan()` calls at each infrastructure call site) rather than via OTel's
  `@opentelemetry/instrumentation-*` auto-instrumentation packages. This was a deliberate
  choice: the spec requires every span to carry `operation`/`aggregateId`, which generic
  auto-instrumentation has no way to know — manual instrumentation at the call site was
  the only way to satisfy that requirement correctly, and it's fully testable without a
  live collector.
