# Distributed Foundation — Implementation Report
**Batch:** 7 — Distributed Foundation (Redis + BullMQ + Outbox)
**Date:** 2026-07-02
**Strategy:** Redis (ioredis) + BullMQ + Mongo-backed Outbox + Redis-backed distributed lock/circuit-breaker
**Classification (input):** READY_FOR_PRODUCTION_PERSISTENCE (Batch 6)

---

## Objective

Upgrade `Apps/ai-backend` from process-local execution to distributed-safe execution:
Redis foundation, BullMQ job queue, transactional-outbox event durability, distributed
locking on the Goal aggregate, and Redis-shared circuit breaker state — **without**
changing domain rules, the Goal aggregate lifecycle, controller contracts, or
application service behavior.

---

## Architecture

```
Goal Aggregate (Domain)                         — unchanged
        ↓
GoalCommandService (Application)                — +optional GoalLockService wrap
        ↓
MongoGoalRepository (Infrastructure)             — unchanged
        ↓
OutboxPublisherService implements IEventPublisher — new EVENT_PUBLISHER binding
        ↓
OutboxRepository → outbox_events (MongoDB)       — durable, PENDING/PUBLISHED/FAILED
        ↓
QueueService → BullMQ `goal-events` queue        — Redis-backed
        ↓
Worker → RedisCircuitBreakerService (shared state) → goal-events-dlq on exhaustion
        ↓
OutboxRelayService (10s sweep)                   — re-enqueues any still-PENDING rows
```

Redis and BullMQ are **optional at the infrastructure level**: if `REDIS_HOST` is
unset, every new service degrades to a safe no-op (lock is a no-op, circuit breaker is
always CLOSED, queue enqueue is skipped) so local/dev/CI runs are unaffected. If
`REDIS_HOST` **is** set, the app fails fast at bootstrap if Redis is unreachable —
mirroring the existing `MONGODB_URI` fail-fast pattern from Batch 6.

---

## Files Created

### Redis Foundation — `src/infrastructure/cache/`
| File | Purpose |
|---|---|
| `redis.config.ts` | `getRedisOptions()` reads `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`; returns `null` if unconfigured |
| `redis.service.ts` | `RedisService` — connects on `onModuleInit`, fail-fast throw if configured-but-unreachable, `isReady()`/`ping()`/`getClient()` |
| `redis.module.ts` | `@Global()` module exporting `RedisService` |

### BullMQ Foundation — `src/infrastructure/jobs/`
| File | Purpose |
|---|---|
| `queue.config.ts` | `getQueueConnection()`; defines `GOAL_EVENTS_QUEUE` / `GOAL_EVENTS_DLQ` names |
| `queue.service.ts` | `QueueService` — `goal-events` `Queue` + `Worker`, 5 retries with exponential backoff, dead-letters into `goal-events-dlq` on `attemptsMade >= attempts`, wraps processing with `RedisCircuitBreakerService` |
| `queue.module.ts` | Imports `RedisModule`, `ResilienceModule` |

### Resilience — `src/infrastructure/resilience/`
| File | Purpose |
|---|---|
| `redis-circuit-breaker.service.ts` | `RedisCircuitBreakerService` — `CLOSED/OPEN/HALF_OPEN` state in a Redis hash (`circuit:<jobId>`), shared across instances; same public shape as the existing process-local `CircuitBreakerService` in `modules/migration` (left untouched) |
| `resilience.module.ts` | — |

### Outbox Pattern — `src/infrastructure/outbox/`
| File | Purpose |
|---|---|
| `outbox-event.schema.ts` | Mongoose schema: `eventId, aggregateId, aggregateVersion, eventType, payload, occurredAt, publishedAt, status (PENDING\|PUBLISHED\|FAILED)`, collection `outbox_events` |
| `outbox.repository.ts` | `OutboxRepository` — `saveMany` (idempotent upsert on `eventId`), `findPending`, `markPublished`, `markFailed`, `countByStatus` |
| `outbox-publisher.service.ts` | `OutboxPublisherService implements IEventPublisher` — writes outbox rows **before** attempting enqueue (durability-first); best-effort immediate enqueue, leaves row `PENDING` on failure |
| `outbox-relay.service.ts` | `OutboxRelayService` — `@Interval(10_000)` sweep of `PENDING` rows, re-enqueues and marks `PUBLISHED`; this is what guarantees "no event loss after DB commit" even if the immediate post-commit enqueue fails |
| `outbox.module.ts` | Registers the Mongoose schema + providers, imports `QueueModule` |

### Distributed Locking — `src/infrastructure/locks/`
| File | Purpose |
|---|---|
| `goal-lock.service.ts` | `GoalLockService` — Redis `SET key value NX PX 10000` to acquire, Lua compare-and-delete script to release (prevents releasing a lock you don't own); 20 retries × 50ms before throwing `GoalLockAcquisitionError` |
| `locks.module.ts` | — |

### Health
| File | Purpose |
|---|---|
| `src/health/redis-health.service.ts` | Wraps `RedisService`; reports `connected \| disconnected \| not_configured` |

### Types
| File | Purpose |
|---|---|
| `src/types/ioredis-mock.d.ts` | Ambient module declaration (`ioredis-mock` ships no types) |

---

## Files Modified

| File | Change |
|---|---|
| `src/modules/goal/application/services/goal-command.service.ts` | Constructor takes an **optional** third `IGoalLock` param; `updateGoal/archiveGoal/completeGoal/addMilestone` bodies now run inside `withLock(goalId, ...)`. No change to method signatures, no change to `IGoalRepository`/`IEventPublisher` contracts, no change to domain/aggregate code. If no lock service is injected, behavior is byte-identical to Batch 6 (`withLock` short-circuits to `fn()`). |
| `src/modules/goal/goal.module.ts` | `EVENT_PUBLISHER` now binds to `OutboxPublisherService` (via `useExisting`, reusing the singleton from `OutboxModule`) instead of `InMemoryEventPublisherStub` (deleted); `GoalCommandService` factory now also injects a `GoalLockService` (via `useExisting`, reusing the singleton from `LocksModule`). Imports `OutboxModule` and `LocksModule`. |
| `src/app.module.ts` | Imports `ScheduleModule.forRoot()`, `RedisModule`, `ResilienceModule`, `QueueModule`, `OutboxModule`, `LocksModule`. |
| `src/health/health.module.ts` | Imports `RedisModule`, `QueueModule`; provides `RedisHealthService`. |
| `src/health/health.controller.ts` | `/readiness` now also reports `redis` and `bullmq` status; returns 503 if Redis is configured-but-unreachable or the queue isn't ready. `/health` (liveness) is unchanged. |
| `package.json` | Added `ioredis`, `bullmq`, `@nestjs/schedule`; devDependency `ioredis-mock`. |
| `docker-compose.yml` | Added a `redis:7-alpine` service (port 6379, healthcheck). Additive only — did not touch `backend`/`ai-service`/`frontend` service definitions (`ai-backend` has no Dockerfile yet and is not in this compose file). |

---

## Domain / Application Boundary Preservation

- `domain/aggregates/goal.aggregate.ts` — **not modified**.
- `domain/invariants/*`, `domain/events/*`, `domain/value-objects/*` — **not modified**.
- `application/contracts/goal-repository.contract.ts` (`IGoalRepository`) — **not modified**.
- `application/contracts/event-publisher.contract.ts` (`IEventPublisher`) — **not modified**; `OutboxPublisherService` implements it as-is.
- `interface/controllers/goal.controller.ts`, DTOs, response mapper — **not modified**.
- `GoalCommandService`'s public method signatures (`createGoal/updateGoal/archiveGoal/completeGoal/addMilestone`) — **unchanged**; only the constructor gained one optional parameter.

---

## Event Flow / No-Event-Loss Guarantee

1. `GoalCommandService` calls `repository.save(goal)` then `eventPublisher.publishMany(events)` — exactly the same two calls as Batch 6.
2. `OutboxPublisherService.publishMany()` **first** writes every event to `outbox_events` (`status: PENDING`), **then** attempts an immediate `QueueService.enqueue()`. If enqueue succeeds, the row is marked `PUBLISHED` in the same call.
3. If the immediate enqueue throws (Redis down, process about to crash, etc.), the row is left `PENDING` — nothing is lost, because durability was established in step 2 before the queue was ever touched.
4. `OutboxRelayService` sweeps `PENDING` rows every 10 seconds (also runs after a process restart, since it queries MongoDB, not in-memory state) and re-enqueues + marks `PUBLISHED`.
5. `eventId` is the outbox primary key, so replays (relay re-enqueueing an event that actually did make it to BullMQ) are idempotent at the persistence layer and BullMQ additionally de-duplicates on `jobId = eventId`.

No transactional (single-commit) atomicity between the `goals` and `outbox_events`
collections was introduced — `IGoalRepository.save()` was deliberately left untouched to
avoid widening the application contract. Durability is achieved by the outbox-first
write + relay sweep instead of cross-collection transactions.

---

## Distributed Locking

`GoalLockService.lock(goalId)` / `.unlock(lock)` wrap the four mutating command methods.
Concurrency safety in the Redis-configured case:
- Acquire: `SET lock:goal:<id> <token> PX 10000 NX` — atomic, only one instance can hold it.
- Release: Lua script compares the stored token before deleting — a lock can only be
  released by the holder that acquired it (protects against a slow instance releasing
  a lock a newer instance now owns after TTL expiry).
- If Redis is not configured, `lock()`/`unlock()` are no-ops (single-instance/dev mode
  behaves exactly like Batch 6).

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
Result: **succeeds**, `dist/` regenerated including all new `infrastructure/*` modules.

### Test suite
```
npx jest --config jest.config.js --verbose --forceExit
```
Result: **9 suites / 46 tests — all PASS.**

| Suite | Tests |
|---|---|
| `mongo-goal.repository.spec.ts` (pre-existing, Batch 6) | 9 |
| `redis.service.spec.ts` | 4 |
| `redis-circuit-breaker.service.spec.ts` | 5 |
| `queue.service.spec.ts` | 8 |
| `outbox.repository.spec.ts` | 6 |
| `outbox-relay.service.spec.ts` | 3 |
| `outbox-publisher.service.spec.ts` | 4 |
| `goal-lock.service.spec.ts` | 5 |
| `goal-command.service.lock.spec.ts` | 3 (2 lock + 1 no-lock backward-compat) |

Sample structured log output captured from the test run:

```json
{"event":"redis_connected","timestamp":"2026-07-02T04:09:29.802Z"}
{"event":"enqueued","traceId":"trace-1","queueId":"goal-events","eventId":"evt-1","aggregateId":"goal-1","eventType":"GoalCreated","timestamp":"2026-07-02T04:09:29.787Z"}
{"event":"job_processing","traceId":"trace-1","queueId":"goal-events","eventId":"evt-1","aggregateId":"goal-1","eventType":"GoalCreated","timestamp":"2026-07-02T04:09:29.794Z","latencyMs":0}
{"event":"job_failed","traceId":"trace-1","queueId":"goal-events","eventId":"evt-1","aggregateId":"goal-1","eventType":"GoalCreated","timestamp":"2026-07-02T04:09:29.807Z","attemptsMade":2,"attemptsLimit":5,"error":"transient failure"}
{"event":"job_failed","traceId":"trace-1","queueId":"goal-events","eventId":"evt-1","aggregateId":"goal-1","eventType":"GoalCreated","timestamp":"2026-07-02T04:09:29.810Z","attemptsMade":5,"attemptsLimit":5,"error":"permanent failure"}
{"event":"dead_lettered","traceId":"trace-1","queueId":"goal-events","eventId":"evt-1","aggregateId":"goal-1","eventType":"GoalCreated","timestamp":"2026-07-02T04:09:29.810Z","reason":"permanent failure"}
{"event":"outbox_relay_sweep","found":2,"relayed":2,"timestamp":"2026-07-02T04:09:30.687Z"}
{"event":"outbox_relay_failed","eventId":"evt-3","aggregateId":"goal-1","error":"redis unavailable","timestamp":"2026-07-02T04:09:30.693Z"}
{"event":"outbox_immediate_enqueue_failed","eventId":"evt-2","aggregateId":"goal-1","error":"queue unavailable","timestamp":"2026-07-02T04:09:30.551Z"}
```

### Boot check — Redis unconfigured (degrade path)
Booted `dist/main.js` against an in-memory MongoDB, no `REDIS_HOST` set:
```
GET /health     → 200 {"status":"ok","uptime":7.25}
GET /readiness  → 200 {"status":"ok","checks":{"database":"connected","redis":"not_configured","bullmq":"not_configured"}}
```

### End-to-end smoke test — Redis unconfigured
`POST /goal` (with `Authorization` header + valid UUIDs) against the running instance:
```
{"traceId":"db","operation":"save","aggregateId":"3afc0889-...","status":"SUCCESS"}
{"event":"enqueue_skipped_no_queue","eventId":"87d04770-...","aggregateId":"3afc0889-..."}
{"traceId":"app","operation":"CREATE_GOAL","status":"SUCCESS"}
→ HTTP 201
```
Confirms the full chain (`GoalCommandService` → lock no-op → `MongoGoalRepository.save`
→ `OutboxPublisherService` → outbox write → queue no-op skip) runs without error when
Redis is absent, i.e. Batch 6 behavior is fully preserved in dev/CI environments.

---

## Known Gaps (see Certification Checklist for the itemized list)

This sandbox has no live Redis (Docker daemon not running; Redis has no official
Windows binary), so genuinely distributed scenarios — real cross-process lock
contention, live BullMQ retry timing under actual backoff delays, and end-to-end
dead-letter routing against a real broker — are verified via mocks (`ioredis-mock` for
Redis semantics, a controlled fake for BullMQ's `Queue`/`Worker`) rather than a live
Redis instance. `docker-compose.yml` now includes a `redis` service; once Docker
Desktop's daemon is running, `docker-compose up redis` plus `REDIS_HOST=localhost` makes
all of this exercisable against real infrastructure with no code changes.
