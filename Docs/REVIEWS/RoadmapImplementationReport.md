# Roadmap Implementation Report

WP-06A — Batch 10: Roadmap Intelligence Module
Location: `Apps/ai-backend/src/modules/roadmap/`

## 1. Scope Delivered

Goal → Roadmap transformation, implemented as a full DDD module mirroring the
existing `modules/goal` reference architecture (domain / application /
infrastructure / interface layers). No LLM integration, no recommendation
engine, no assessment engine — deterministic rule-based planning only, per
the batch constraints.

## 2. Domain Model

| Element | File | Notes |
|---|---|---|
| Aggregate Root | `domain/aggregates/roadmap.aggregate.ts` | `Roadmap` — owns phases, revisions, progress, planner metadata, and a stored `goalSnapshot` (the original planning input) so `RegenerateRoadmap` can re-run the planner without a live dependency on the Goal module at command time. |
| Entities | `domain/entities/roadmap-{phase,milestone,task,revision,progress}.entity.ts` | `RoadmapPhase → RoadmapMilestone → RoadmapTask` nesting; `RoadmapRevision` is the append-only version-history record; `RoadmapProgress` is the completion-ratio value holder. |
| Value Objects | `domain/value-objects/{roadmap-status,roadmap-complexity,estimated-duration,priority-weight}.vo.ts` | `RoadmapStatus` (DRAFT/PUBLISHED/ARCHIVED/COMPLETED), `RoadmapComplexity` (LOW/MEDIUM/HIGH/VERY_HIGH, score-derived), `EstimatedDuration`, `PriorityWeight` (goal priority → numeric weight for balancing). |
| Invariants | `domain/invariants/{roadmap-lifecycle,roadmap-version,roadmap-structure}.invariant.ts` | Lifecycle transition table, optimistic-concurrency version check, and "every roadmap must contain phases → milestones → ordered tasks" structural rule. |
| Domain Errors | `domain/errors/roadmap-domain.error.ts` | `RoadmapDomainError` with typed codes, mapped to HTTP-facing application errors in the command service. |
| Events | `domain/events/roadmap-events.ts`, `roadmap-event-metadata.ts` | `RoadmapCreated`, `RoadmapUpdated`, `RoadmapPublished`, `RoadmapArchived`, `RoadmapCompleted`, `RoadmapRegenerated` — all six events required by the spec. |

## 3. Intelligence Engine

`domain/engine/roadmap-planning.engine.ts` — `RoadmapPlanningEngine`, deterministic, no LLM, no randomness:

- **Goal decomposition** — phase count scales with `GoalDifficulty` (BEGINNER=2 … EXPERT=5), each phase split into milestones, each milestone into ordered tasks.
- **Dependency ordering** — every task depends on the immediately preceding task in the full roadmap-wide sequence (a single linear chain), so phases/milestones/tasks are strictly ordered end to end.
- **Milestone generation** — 2 milestones/phase by default, 3 if the goal has more than 2 constraints.
- **Duration estimation** — per-task base duration by difficulty, summed into `estimatedDurationDays`.
- **Complexity estimation** — a weighted score (difficulty rank + constraint count + priority weight) mapped to `RoadmapComplexity`.
- **Priority balancing** — higher `GoalPriority` compresses the per-task duration estimate (never below 1 day), reflecting urgency without touching structure.

Reproducibility (a hard rule from the spec) holds because the engine is pure: identical `PlanningInput` always yields byte-identical `PlanningResult`, including generated ids (`${goalId}-phase-N-milestone-M-task-K`). Verified in `domain/engine/__tests__/roadmap-planning.engine.spec.ts`.

## 4. Application Layer

Commands: `CreateRoadmap`, `UpdateRoadmap`, `ArchiveRoadmap`, `PublishRoadmap`, `RegenerateRoadmap` (plus an additional `CompleteRoadmapTask` command driving the Progress Model — not in the spec's command list verbatim, but required to make `RoadmapCompleted`/progress observable through the API without an assessment engine).

Queries: `GetRoadmap`, `GetRoadmaps`, `GetRoadmapProgress`, `GetRoadmapHistory`.

`RoadmapCommandService` / `RoadmapQueryService` mirror `GoalCommandService` / `GoalQueryService`: optional distributed lock around mutations, structured JSON logging per operation, and domain-error → application-error mapping (`RoadmapNotFoundError`, `RoadmapValidationError`, `RoadmapVersionConflictError`, `RoadmapStateTransitionError`).

## 5. Versioning

`RoadmapRevision` is append-only: `create` appends revision 1 (`CREATED`), `updateDefinition` appends `UPDATED`, `regenerate` appends `REGENERATED`. No revision is ever mutated or removed — verified in both the aggregate unit test and the Mongo integration test (save → reload → revision count/order preserved).

## 6. API

All 7 endpoints from the spec, plus 2 read-only sub-resources needed to expose the Progress Model and version history queries already required by the spec:

```
POST   /roadmap
GET    /roadmap
GET    /roadmap/:id
PUT    /roadmap/:id
DELETE /roadmap/:id            (archive)
POST   /roadmap/:id/publish
POST   /roadmap/:id/regenerate
GET    /roadmap/:id/progress                  (additional — backs GetRoadmapProgress)
GET    /roadmap/:id/history                   (additional — backs GetRoadmapHistory)
POST   /roadmap/:id/tasks/:taskId/complete     (additional — mutation path for the Progress Model; without it, task completion existed only in the domain/application layers with no way to reach it over HTTP)
```

Guarded by `RoadmapGuard` (delegates to the shared `JwtAuthGuard`) and `PermissionGuard` with 5 new permissions: `Roadmap.Read`, `Roadmap.Write`, `Roadmap.Publish`, `Roadmap.Archive`, `Roadmap.Regenerate` (added to `permission.enum.ts` / `role-permissions.map.ts`, TEACHER gets all, STUDENT gets Read only, ADMIN/SYSTEM get all).

## 7. Observability

- Metrics added to the shared `MetricsService`: `roadmap_created_total`, `roadmap_regenerated_total`, `roadmap_generation_duration` (histogram around `RoadmapPlanningEngine.generate`).
- Structured logs carry `traceId`/`aggregateId` throughout (command/query services, Mongo repository); `RoadmapEventMetadata` additionally carries `goalId` and `plannerVersion` on every domain event for traceability back to both the source Goal and the planner version that produced the plan.

## 8. Infrastructure Reuse (no platform foundation changes)

Reused as-is: Mongoose connection, Outbox pattern, BullMQ queue, Redis-backed distributed lock pattern (new `RoadmapLockService` sibling to `GoalLockService`, same TTL/retry constants), RBAC guard/decorator, tracing/metrics services.

One small, necessary fix to shared infrastructure: `AuditLogService.recordFromDomainEvent` hardcoded `resource: 'Goal:...'` for every event — this was a latent bug that would have mislabeled every Roadmap audit entry as a Goal entry. Fixed to derive the aggregate name from the event type's leading capitalized word (`GoalCreated` → `Goal`, `RoadmapPublished` → `Roadmap`), with no change to its call signature or the Goal module's behavior (all Goal audit tests still pass).

## 9. Testing

46 roadmap-specific tests (7 suites) + full `ai-backend` suite (231 tests, 44 suites) pass:

- `roadmap-planning.engine.spec.ts` — reproducibility, phase scaling by difficulty, milestone/task non-emptiness, linear dependency ordering, duration/complexity estimation, priority balancing, constraint-driven complexity.
- `roadmap.aggregate.spec.ts` — Goal → Roadmap creation and event emission, lifecycle transitions + terminal-state guard, optimistic-concurrency rejection, progress calculation up to auto-completion (`RoadmapCompleted`), append-only regeneration, unknown-task rejection.
- `mongo-roadmap.repository.spec.ts` (MongoMemoryServer integration) — create/read/update/delete, revision history survives save/reload, `findAll` learner filtering, stale-version rejection after reload, DB-failure propagation.
- `roadmap-command.service.lock.spec.ts` — distributed lock acquired/released around mutations (including on failure), lock-optional backward compatibility, Goal→Roadmap decomposition end-to-end through the command service, domain-error → application-error mapping.
- `create-roadmap.dto.spec.ts` — request validation (UUID fields, required fields, array/date shape).
- `role-permissions.map.spec.ts` (extended) — TEACHER/STUDENT authorization boundaries for all 5 new Roadmap permissions.

## 10. Deliberate Scope Boundaries

- No LLM call anywhere in the planning path — `RoadmapPlanningEngine` is pure arithmetic/string templating over `PlanningInput`.
- No recommendation or assessment engine touched or invoked.
- `RoadmapService`/`roadmap.service.ts` (the pre-existing facade consumed by `AiRuntimeService`) was left untouched and still exported from `RoadmapModule`, so no other module's behavior changed.
