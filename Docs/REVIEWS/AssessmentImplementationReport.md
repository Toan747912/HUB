# Assessment Implementation Report

WP-06A — Batch 11: Assessment Intelligence Module
Location: `Apps/ai-backend/src/modules/assessment/`

## 1. Scope Delivered

Deterministic learner assessment: competency inference, knowledge-gap detection, confidence estimation, and learning-readiness calculation from Roadmap/task-completion signals. Structurally mirrors the certified `modules/goal` and `modules/roadmap` DDD modules (domain / application / infrastructure / interface layers). No LLM, no embeddings, no external AI service — pure business-logic arithmetic over an explicit input signal set.

## 2. Domain Model

| Element | File | Notes |
|---|---|---|
| Aggregate Root | `domain/aggregates/assessment.aggregate.ts` | `Assessment` — owns the latest `AssessmentResult` (replaced on each run) plus an append-only `AssessmentHistory` log. |
| Entities | `domain/entities/{skill-score,competency,knowledge-gap,assessment-result,assessment-history}.entity.ts` | `SkillScore` = raw per-skill-area evidence (task counts); `Competency` = the classified level derived from it; `KnowledgeGap` = a flagged shortfall; `AssessmentResult` = the full snapshot of one engine run; `AssessmentHistory` = one append-only ledger row per lifecycle event. |
| Value Objects | `domain/value-objects/{assessment-status,confidence-score,competency-level,knowledge-weight}.vo.ts` | `AssessmentStatus` (DRAFT/COMPLETED/APPROVED/ARCHIVED), `ConfidenceScore` (0-100), `CompetencyLevel` (NOVICE→EXPERT, score-derived), `KnowledgeWeight` (LOW→CRITICAL, severity-derived). |
| Invariants | `domain/invariants/{assessment-lifecycle,assessment-version}.invariant.ts` | Lifecycle transition table; optimistic-concurrency version check. |
| Domain Errors | `domain/errors/assessment-domain.error.ts` | `AssessmentDomainError` with typed codes, mapped to HTTP-facing application errors in the command service. |
| Events | `domain/events/assessment-events.ts`, `assessment-event-metadata.ts` | All 5 events required by the spec: `AssessmentCreated`, `AssessmentCompleted`, `CompetencyUpdated`, `KnowledgeGapDetected`, `AssessmentArchived`. |

## 3. Assessment Engine

`domain/engine/assessment.engine.ts` — `AssessmentEngine`, deterministic, no LLM/embeddings/external calls:

- **Competency inference** — tasks are grouped by `skillArea`; each area's raw score is `completedTasks / totalTasks * 100`, then mapped to a `CompetencyLevel` via fixed thresholds (NOVICE < 20 < DEVELOPING < 40 < PROFICIENT < 70 < ADVANCED < 90 ≤ EXPERT).
- **Gap detection** — any skill area scoring below 50 becomes a `KnowledgeGap`; its `KnowledgeWeight` severity combines how far below threshold the score is with how much that area's completed tasks overran their estimated duration.
- **Confidence estimation** — `confidence = roadmapCompletionRatio*0.6 + avgCompetencyScore*0.4 − latencyPenalty − revisionPenalty + stabilityAdjustment`, clamped to [0,100]. Latency penalty comes from average task-duration overrun; revision penalty from roadmap regeneration churn; stability adjustment is a ±5 bonus/penalty from the standard deviation of the last 3 prior confidence scores (rewards a learner whose signal is consistent, penalizes wild swings) — all computed from the input arrays, no live state.
- **Learning readiness calculation** — `READY` requires ≥80% roadmap completion, no CRITICAL gap, and confidence ≥60; `AT_RISK` triggers on any CRITICAL gap or confidence <40; otherwise `NOT_READY`.
- **Risk detection** — folded into readiness/gap severity rather than a separate signal: a CRITICAL-weight gap is itself the risk flag, and it alone is sufficient to force `AT_RISK` regardless of completion percentage.

Determinism verified directly: identical `AssessmentInput` → identical `AssessmentComputation` (object-equality test), including the stability adjustment which depends only on the `previousRuns` array passed in, never on wall-clock time.

## 4. Application Layer

Commands: `CreateAssessment`, `RunAssessment`, `ApproveAssessment`, `ArchiveAssessment` (all 4 from the spec). Queries: `GetAssessment`, `GetAssessments`, `GetCompetencyProfile`, `GetKnowledgeGaps` (all 4 from the spec).

`AssessmentCommandService` / `AssessmentQueryService` mirror the Goal/Roadmap command/query services: optional distributed lock around mutations, structured JSON logging, domain-error → application-error mapping (`AssessmentNotFoundError`, `AssessmentValidationError`, `AssessmentVersionConflictError`, `AssessmentStateTransitionError`). `RunAssessment` can be called repeatedly while `COMPLETED` to reflect updated progress; it is rejected once the assessment is `APPROVED` or `ARCHIVED`.

**Input snapshot boundary**: per the Roadmap module's precedent (storing a `goalSnapshot` to avoid a runtime dependency on `GoalModule`), the Assessment module never calls into `RoadmapModule`/`GoalModule` at runtime. `RunAssessmentCommand` takes the roadmap-completion ratio, task-completion signals, revision count, and prior-run history directly as command input — supplied by whichever caller (API client, orchestration layer) already holds those signals. This keeps "only deterministic inference over given inputs" honest and avoids new cross-module coupling.

## 5. Versioning / History

`AssessmentHistory` is append-only: `CREATED` on creation, `RUN` on every `RunAssessment` (including re-runs), `APPROVED`, `ARCHIVED`. No entry is ever mutated or removed — verified in the aggregate unit test (repeated runs grow the history to 3+ entries) and the Mongo integration test (history survives save/reload in original order).

## 6. API

All 6 endpoints from the spec, plus 2 additional endpoints needed to reach the `ApproveAssessment`/`ArchiveAssessment` commands over HTTP (the spec's API section lists no URL for either, mirroring the same gap found in the Roadmap batch's `RegenerateRoadmap`/`PublishRoadmap` case):

```
POST /assessment
POST /assessment/run
GET  /assessment
GET  /assessment/:id
GET  /assessment/:id/profile
GET  /assessment/:id/gaps
POST /assessment/:id/approve   (additional — otherwise ApproveAssessment is unreachable over HTTP)
POST /assessment/:id/archive   (additional — otherwise ArchiveAssessment is unreachable over HTTP)
```

Guarded by `AssessmentGuard` (delegates to `JwtAuthGuard`) and `PermissionGuard` with 5 new permissions: `Assessment.Read`, `Assessment.Write`, `Assessment.Run`, `Assessment.Approve`, `Assessment.Archive`. TEACHER gets all 5; STUDENT gets `Read` + `Run` only (a learner can request/refresh their own assessment but cannot approve or archive it); ADMIN/SYSTEM get all.

## 7. Observability

- Metrics added to the shared `MetricsService`: `assessment_run_total` (counter), `assessment_duration` (histogram around `AssessmentEngine.evaluate`), `knowledge_gap_total` (counter, incremented by gap count per run), `confidence_average` (gauge, running mean maintained internally across all recorded runs).
- Structured logs carry `traceId`/`aggregateId`; `AssessmentEventMetadata` additionally carries `goalId`, `roadmapId`, and `engineVersion` on every domain event.

## 8. Infrastructure Reuse (no platform foundation changes)

Reused as-is: Mongoose connection, Outbox event-publishing pattern, BullMQ queue, RBAC guard/decorator, tracing/metrics services. Added a sibling `AssessmentLockService` (same TTL/retry constants as `GoalLockService`/`RoadmapLockService`) and a sibling `AssessmentOutboxPublisherService` (same cast-at-the-seam pattern the Roadmap module already established for reusing the Goal-shaped Outbox/Queue generics). No further changes to platform foundation were required this batch — `AuditLogService`'s aggregate-name derivation, fixed during the Roadmap batch, already generalizes correctly to `Assessment*` events without modification.

## 9. Testing

52 assessment-specific tests (7 suites) + full `ai-backend` suite (268 tests, 49 suites) pass:

- `assessment.engine.spec.ts` — determinism, competency inference from completion ratio, gap detection (present/absent), confidence bounds and revision-churn sensitivity, stability bonus/penalty from prior-run variance, readiness classification (READY/AT_RISK boundaries).
- `assessment.aggregate.spec.ts` — DRAFT→COMPLETED creation and event emission, conditional `KnowledgeGapDetected` emission, repeatable runs with growing append-only history, optimistic-concurrency rejection, approve requires a prior run, APPROVED/ARCHIVED lock further runs, archive from any non-terminal state emits `AssessmentArchived`.
- `mongo-assessment.repository.spec.ts` (MongoMemoryServer integration) — create/read/update/delete, result + history survive save/reload, `findAll` learner filtering, stale-version rejection after reload, DB-failure propagation.
- `assessment-command.service.lock.spec.ts` — distributed lock acquired/released around `runAssessment` (including on failure), lock-optional backward compatibility, `createAssessment` end-to-end, same-input-twice determinism through the full command-service path, locked-state re-run mapped to `AssessmentStateTransitionError`.
- `run-assessment.dto.spec.ts` — request validation (UUID, ratio bounds, non-empty tasks array, non-negative revision count, malformed nested task).
- `role-permissions.map.spec.ts` (extended) — TEACHER/STUDENT authorization boundaries for all 5 new Assessment permissions.

## 10. Deliberate Scope Boundaries

- No LLM, no embeddings, no external AI service call anywhere in the engine or its import graph — `AssessmentEngine` is pure arithmetic over arrays.
- No recommendation engine touched (`RecommendationModule` untouched) — this batch produces signals a future recommendation engine could consume, but does not itself recommend anything.
- `AssessmentService`/`assessment.service.ts` (the pre-existing facade consumed by `AiRuntimeService`) was left untouched and still exported from `AssessmentModule`, so no other module's behavior changed.
