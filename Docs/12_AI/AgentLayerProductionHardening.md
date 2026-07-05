# Agent Layer Production Hardening (WP-AI-04B.1)

Status: complete. Scope: hardening only — no architecture change, no new public API, no redesign of Runtime/Coordinator/Message Bus/Learning/Memory/Planner layers.

---

## 1. Architecture Summary

Unchanged. The Agent Layer remains: agent-core, agent-runtime, agent-coordinator, agent-message-bus, agent-memory, agent-lifecycle, agent-collaboration, agent-learning, agent-tools, sitting behind the AI Brain planner layer. Every module boundary and dependency direction audited in WP-AI-04A stays the same (`npm run audit:agent-layer` — see §7). This work only closes production-readiness gaps within those existing boundaries.

---

## 2. Files Modified

**Learning wiring**
- `agent-coordinator/application/coordinator.service.ts` — optional `LearningService` injection, `triggerLearning()`.
- `agent-collaboration/application/collaboration.service.ts` — optional `LearningService` injection, `triggerLearning()`, `onModuleInit()` session recovery.
- `agent-coordinator/agent-coordinator.module.ts`, `agent-collaboration/agent-collaboration.module.ts` — import `AgentLearningModule`.

**Persistence**
- `agent-learning/interfaces/learning.interface.ts`, `agent-learning/repositories/mongo-learning.repository.ts` — `persistLearningCycle()` (transactional).
- `agent-learning/application/learning.service.ts` — calls `persistLearningCycle()` instead of four sequential writes.
- `agent-message-bus/application/message-store.service.ts`, `agent-message-bus/application/message-bus.service.ts` — `publish()` creates directly as `QUEUED` (one write, not two).
- `agent-coordinator/application/coordinator.service.ts` — swallowed lifecycle-write failures now logged (`logLifecycleWriteFailure`).

**Registry recovery**
- `agent-coordinator/domain/coordination-plan.ts`, `agent-coordinator/schemas/coordination-plan.schema.ts`, `agent-coordinator/repositories/mongo-coordination-plan.repository.ts` — new `coordination_plans` collection.
- `agent-coordinator/application/coordinator-registry.service.ts` — Mongo-backed, `OnModuleInit` recovery.
- `agent-memory/application/memory-store.service.ts` — `queryByScope()` passthrough.
- `agent-collaboration/application/collaboration.service.ts` — `OnModuleInit` session recovery via that passthrough.

**Failure handling**
- `agent-learning/domain/learning.types.ts` (new) — `LearningExecutionError`.
- `agent-message-bus/domain/message-types.ts` — `MessageBusError`.
- `agent-lifecycle/domain/lifecycle.types.ts` — `LifecycleError`.
- `infrastructure/ai-brain/planner-execution-error.ts` (new) — `PlannerExecutionError`, used in `base-planner.service.ts`.

**Operational hardening**
- `agent-memory/application/memory-garbage-collector.service.ts` — `@Interval` scheduling.
- `agent-message-bus/application/message-retention.service.ts` (new), `agent-lifecycle/application/lifecycle-retention.service.ts` (new) — bounded terminal-record retention.
- `agent-message-bus/domain/message-types.ts`, `agent-lifecycle/domain/lifecycle.types.ts` + Mongo repositories — `deleteTerminalOlderThan()`.

**Tests**: extended/added specs in `agent-coordinator`, `agent-collaboration`, `agent-learning`, `agent-message-bus`, `agent-lifecycle`, `agent-memory` covering every change above (see §6/§7).

---

## 3. Learning Integration Flow

```
CoordinatorService.coordinate()  ──┐
                                    ├─→ triggerLearning(plan, result, startedAt)
CollaborationService.collaborate()─┘         │
                                              ▼
                              maps to CompletedExecutionInput
                          (sourceType: 'coordination' | 'collaboration')
                                              │
                                              ▼
                      void learningService?.runCycle(input).catch(logOnly)
```

- The mapping is explicit code in each caller (`triggerLearning`), not reflection, not a poller, not a background scan.
- Fires for every completed run regardless of outcome (`success` / `partial` / `failure`) — `CompletedExecutionInput.status` carries it.
- `learningService` is `@Optional()` in both callers; if absent, `triggerLearning` is a no-op.
- The call is fire-and-forget (`void … .catch(...)`): a rejected `runCycle()` only logs a `*_LEARNING_TRIGGER_FAILED` structured-log event and never affects the `CoordinationResult` / `ReasoningResult` already computed and returned.
- `LearningService.runCycle()` itself now throws a typed `LearningExecutionError` instead of a raw `Error` (see §5), but the best-effort contract at the call site is unaffected either way.

---

## 4. Persistence Decisions

| Sequence | Decision | Why |
| --- | --- | --- |
| `learning.service.ts` runCycle: patterns → knowledge → recommendations → learning record | **Mongo transaction** (`ILearningRepository.persistLearningCycle`, using the existing `withTransaction` helper) | A crash between writes previously orphaned data with no owning `LearningRecord`. The repository (not the service) owns the transaction, since it already owns every model involved — no `Connection` needed in `LearningService`. |
| `MessageBusService.publish()`: create → update to QUEUED | **Collapsed into one write** (`MessageStoreService.create(envelope, MessageStatus.QUEUED)`) | The two writes touched the same document with no need to observe the intermediate `CREATED` state — removing the second write is strictly safer than transacting it. |
| `MessageDispatcherService` status transitions (`DELIVERING` → `DELIVERED`/`FAILED`/`RETRYING`/`DEAD_LETTER`) | **Documented eventual consistency** | Each transition reflects a real delivery attempt separated by actual async work (the dispatch call) — cannot be transactional, and each write is itself a valid recovery checkpoint (`MessageBusService.onModuleInit()` resumes from any in-flight status). |
| `CoordinatorService.runAgent()` lifecycle writes (`createInstance`/`markReady`/`start`/`complete`/`fail`) | **Documented eventual consistency** + **failures now logged, not silently swallowed** | These bracket a real agent invocation over time; the audit trail is intentionally sequential. Previously `.catch(() => undefined)` discarded failures; now `logLifecycleWriteFailure()` logs them via `structuredLogger` while still not failing the agent outcome. |
| `LifecycleRegistryService.transition()`: repository write → cache set | **Documented eventual consistency** | The cache is a derived, recoverable read-through cache; `recoverAll()` already rebuilds it from Mongo on restart. |
| `CoordinatorRegistryService.register()`: cache set → background repository persist | **Documented eventual consistency, best-effort** | Kept synchronous for existing callers (`register()`/`get()` are not `async`); persistence happens in the background with a logged `.catch`. A crash in the narrow window between `register()` and the write completing loses that one plan from recovery — same risk class as the other rows in this table. |

---

## 5. Recovery Strategy

| Component | Before | After |
| --- | --- | --- |
| `MessageBusService` | Already recovered in-flight messages via `onModuleInit()` | Unchanged (reference pattern) |
| `LifecycleRegistryService` / `LifecycleService` | Already recovered active instances via `recoverAll()` / `onModuleInit()` | Unchanged (reference pattern) |
| `CoordinatorRegistryService` | Plain in-memory `Map`, lost on restart | Mongo-backed (`coordination_plans` collection); `OnModuleInit` calls `recoverAll()`, loading the most recent 500 plans into the cache |
| `CollaborationService.sessions` | Plain in-memory `Map`; `persistSession()` wrote snapshots to agent-memory but nothing read them back | `OnModuleInit` calls the new `MemoryStoreService.queryByScope(MemoryScope.SESSION)` passthrough and rehydrates `this.sessions` from the existing snapshots — no new collection |
| `MemoryGarbageCollectorService.cleanupExpired()` | Implemented but never scheduled | `@Interval` `sweep()` every 60s, mirroring `OutboxRelayService.sweep()` |
| `agent_messages` / `agent_instances` retention | No cleanup at all | New `MessageRetentionService` / `LifecycleRetentionService`, each an hourly `@Interval` purging terminal-status records past a retention window |

All new recovery paths were exercised with restart-simulation tests (§6).

---

## 6. Failure-Handling Strategy

Every agent-* module now follows the same pattern agent-coordinator/agent-collaboration already established: **typed error thrown internally, never a raw `Error` crossing a module boundary.**

| Module | Typed error | Replaces |
| --- | --- | --- |
| agent-coordinator | `CoordinationExecutionError` (pre-existing) | — |
| agent-collaboration | `CollaborationExecutionError` (pre-existing) | — |
| agent-learning | `LearningExecutionError` (`LearningErrorCode.CYCLE_FAILED`) | raw `Error` rethrown from `runCycle()`'s catch block |
| agent-message-bus | `MessageBusError` (`MessageBusErrorCode.MESSAGE_NOT_FOUND`) | raw `Error` in `MessageBusService.mustFind()` |
| agent-lifecycle | `LifecycleError` (`LifecycleErrorCode.INSTANCE_NOT_FOUND`) | raw `Error` in `LifecycleRegistryService.resolve()` and `MongoAgentInstanceRepository.update()` |
| AI Brain planner layer | `PlannerExecutionError` (carries `capability`, wraps the original error via `cause`) | raw rethrow in `BasePlannerService.execute()`'s catch block |

Every new error class extends `Error` and preserves the original `message`, so existing message-substring assertions (`.rejects.toThrow('...')`) and `instanceof Error` checks are unaffected. `BasePlannerService` still logs the *original* error's constructor name via `emitObservability` before wrapping, so no diagnostic fidelity is lost.

Learning failures specifically remain **non-fatal by design**: the typed error is only visible to `LearningService.runCycle()`'s direct caller; both `CoordinatorService`/`CollaborationService` catch it at the fire-and-forget call site and only log.

---

## 7. Test Results

```
npm run audit:agent-layer        → 8 categories: 7 PASS, 1 WARNING (pre-existing, out-of-scope legacy ai-runtime module), 0 FAIL
npm run audit:planner-contract   → 5 planners audited, 35/35 checks PASS
npm run typecheck                → clean
npm test                         → 122 test suites, 747 tests, all passing
```

New/extended coverage added in this work:
- `coordinator-registry.service.spec.ts` — restart recovery (`onModuleInit()` repopulates cache from a fake repository), background-persist-on-register.
- `collaboration.service.spec.ts` — session recovery from `MemoryStoreService.queryByScope`, learning-wiring (`runCycle` invoked with the right `CompletedExecutionInput`, and a rejected `runCycle` never fails `collaborate()`).
- `coordinator.service.spec.ts` — same two learning-wiring cases for `coordinate()`.
- `memory-garbage-collector.service.spec.ts` — `sweep()` invokes `cleanupExpired()` and never throws.
- `message-retention.service.spec.ts`, `lifecycle-retention.service.spec.ts` (new) — retention-window cutoff math, `sweep()` never throws.
- `mongo-learning.repository.spec.ts` — `persistLearningCycle()` atomicity: a failure on the final write rolls back the other three (switched this suite from `MongoMemoryServer` to `MongoMemoryReplSet` since transactions require a replica set).

---

## 8. TTL / Retention Policy

| Collection | Policy | Why |
| --- | --- | --- |
| `learning_records`, `execution_patterns`, `knowledge_items`, `recommendations` | **No TTL — retained indefinitely** | These are the durable output of the Adaptive Learning Engine (training/analysis data), not operational/transient state. Archival, if ever needed, is a separate future data-lifecycle work package, not a hardening concern. |
| `agent_messages` | **Manual sweep, not a Mongo TTL index** — `MessageRetentionService` purges `DELIVERED`/`DEAD_LETTER` messages older than 7 days, hourly `@Interval` | A native TTL index can't selectively target only terminal statuses (it would also delete in-flight `QUEUED`/`DELIVERING`/`RETRYING` messages needed for restart recovery), so an application-level sweep restricted to terminal statuses is used instead. |
| `agent_instances` | **Manual sweep** — `LifecycleRetentionService` purges `COMPLETED`/`FAILED`/`STOPPED` instances older than 30 days, hourly `@Interval` | Same reasoning as `agent_messages`; a longer window (30 vs 7 days) since this is the primary per-agent audit trail. Active states are never touched here. |
| `coordination_plans` (new) | **No automated cleanup yet — documented as a known gap** | Bounded implicitly by `recoverAll()` only ever loading the most recent 500 plans into the cache, but the collection itself grows unbounded. Left out of scope for this pass since it's a new collection with no operational history yet; a future pass should add the same sweep pattern once real growth data exists. |
| `agent_memory_records` | **Already had `expiresAt` + `MemoryGarbageCollectorService.cleanupExpired()`, now actually scheduled** (`@Interval`, 60s) | Previously implemented but never wired up — this was the most direct "hardening" gap: an existing safety mechanism that simply never ran in production. |

---

## Certification Readiness

All items from the WP-AI-04B.1 scope are closed:

- [x] Part 1 — Learning wiring (explicit, best-effort, no reflection/polling)
- [x] Part 2 — Persistence hardening (transaction / write-collapse / documented eventual consistency)
- [x] Part 3 — Registry recovery (Mongo-backed, restart-tested)
- [x] Part 4 — Failure-handling consistency (typed errors at every module boundary)
- [x] Part 5 — Operational hardening (scheduled cleanup, documented TTL/retention)
- [x] Part 6 — Recovery review (restart-simulation tests for every recovering component)
- [x] Part 7 — Verification (audits, typecheck, full test suite all green) + this document

No architecture, public API, or module boundary changed. The Agent Layer is ready to move from CONDITIONAL PASS (7/10) to full certification pending final sign-off review.
