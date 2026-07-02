# Recommendation Implementation Report

WP-06A — Batch 12: Recommendation Intelligence Engine
Location: `Apps/ai-backend/src/modules/recommendation/`

## 1. Scope Delivered

The platform's core decision engine: transforms Goal/Roadmap/Assessment signals into task priorities, an adaptive learning plan (per-skill-area strategy), a review schedule, roadmap adjustment suggestions, logical learning-resource references, and difficulty adjustments — entirely deterministic, no LLM/embeddings/vector DB/prompt generation/external AI service anywhere in the module's import graph. Structurally mirrors the certified `modules/goal`, `modules/roadmap`, and `modules/assessment` DDD modules.

## 2. Domain Model

| Element | File | Notes |
|---|---|---|
| Aggregate Root | `domain/aggregates/recommendation.aggregate.ts` | `Recommendation` — created in one shot from a fully-computed `RecommendationComputation` (no separate create-then-run step, unlike Roadmap/Assessment, because the spec's command list has only `GenerateRecommendations`, not a paired create+run). |
| Entities | `domain/entities/{recommendation-item,recommendation-reason,learning-strategy-assignment,review-schedule,priority-decision,recommendation-history}.entity.ts` (+ `recommendation-scores.ts`) | `RecommendationItem` embeds a `RecommendationReason` and a `RecommendationScores` value bag; `LearningStrategyAssignment` is the per-skill-area strategy pick (the spec's "LearningStrategy" entity); `ReviewSchedule` and `PriorityDecision` are the structured schedule/reordering outputs; `RecommendationHistory` is the append-only ledger. |
| Value Objects | `domain/value-objects/{recommendation-type,recommendation-priority,recommendation-confidence,recommendation-status,learning-strategy}.vo.ts` | `RecommendationStatus` (GENERATED/APPROVED/REJECTED/ARCHIVED), `RecommendationType` (6 kinds — see §3), `RecommendationPriority` (score-derived), `RecommendationConfidence`, `LearningStrategy` (the 8 required strategies). |
| Invariants | `domain/invariants/{recommendation-lifecycle,recommendation-version}.invariant.ts` | Lifecycle transition table (GENERATED → APPROVED\|REJECTED\|ARCHIVED; APPROVED/REJECTED → ARCHIVED only); optimistic-concurrency version check. |
| Events | `domain/events/recommendation-events.ts` | All 5 events required by the spec: `RecommendationGenerated`, `RecommendationApproved`, `RecommendationRejected`, `RecommendationArchived`, `LearningStrategyChanged`. |

## 3. Decision Engine

`domain/engine/recommendation.engine.ts` — `RecommendationEngine`, deterministic, zero external calls:

- **Priority scoring** — 6 named scores computed per skill area (`needScore`, `urgencyScore`, `difficultyScore`, `confidenceScore`, `riskScore`) combine into `priorityScore` (weighted: need 35% / urgency 25% / risk 20% / uncertainty 20%) and a distinct `overallScore` (a straight average of all 5, a general severity indicator rather than an ordering signal). All formulas are named private methods, independently testable.
- **Dependency analysis** — a task is `blocked` if any id in its `dependsOn` list is not yet completed; blocked tasks are forced to `priorityScore = 0` and sorted after all unblocked tasks.
- **Gap resolution** — a `KnowledgeGap` (from the Assessment module's output) drives both a `REVIEW_SCHEDULE` recommendation item and a structured `ReviewSchedule` entry, with `intervalDays` mapped deterministically from gap weight (CRITICAL=1, HIGH=3, MEDIUM=7, LOW=14).
- **Adaptive difficulty** — a `DIFFICULTY_ADJUSTMENT` item is emitted only when perceived difficulty (goal difficulty + competency shortfall) diverges from actual competency by more than a fixed margin in either direction; otherwise no noise is generated.
- **Review scheduling** — `dueDate = referenceDate + intervalDays`, computed by the engine from an explicit `referenceDate` input field (never `Date.now()`), which is what keeps date-bearing output reproducible under the "same input → same output" rule.
- **Task reordering suggestions** — `PriorityDecision` entities rank all incomplete tasks by priority score (blocked tasks last), pairing `originalOrder` with `suggestedOrder` so a caller can render a diff.
- **Roadmap adjustment suggestions** — three independent, deterministic triggers: `readiness === 'AT_RISK' && overallUrgency >= 70` → extend target date; `≥2` CRITICAL gaps → regenerate-roadmap recommended; `revisionCount >= 8` → reduce scope. None, some, or all three can fire in a single generation.
- **Learning strategy selection** — one of the 8 required strategies per skill area, chosen by a strict-precedence decision tree (see §4) so the outcome for any given input combination is unambiguous and testable.

## 4. Learning Strategy Decision Tree (in evaluation order — first match wins)

1. CRITICAL gap **and** competency < 30 → `RECOVERY`
2. HIGH or CRITICAL gap → `DEEP_DIVE`
3. A completed task in this skill area overran its estimate by ≥50% → `REPEAT`
4. Competency < 50 → `REVIEW`
5. Competency < 70 → `PRACTICE`
6. Roadmap revision churn ≥5 and competency < 90 → `SLOW_DOWN`
7. Competency < 90 → `ADVANCE`
8. Otherwise (competency ≥90, no gap) → `SKIP`

All 8 branches are covered by a dedicated test in `recommendation.engine.spec.ts`. `GET /recommendation/strategies` exposes a static, human-readable description of each strategy (`domain/engine/learning-strategy-catalog.ts`) independent of any specific recommendation — this backs the spec's `GetLearningStrategies` query, which (per its own API list) is a standalone endpoint, not a per-recommendation one.

## 5. Application Layer

Commands: `GenerateRecommendations`, `ApproveRecommendation`, `RejectRecommendation`, `ArchiveRecommendation` (all 4 from the spec). Queries: `GetRecommendation`, `GetRecommendations`, `GetRecommendationHistory`, `GetLearningStrategies` (all 4 from the spec).

`RecommendationCommandService` / `RecommendationQueryService` mirror the established command/query service pattern: optional distributed lock around mutations, structured JSON logging, domain-error → application-error mapping.

**Input snapshot boundary**: consistent with the precedent set by Roadmap (`goalSnapshot`) and Assessment (caller-supplied signals), the Recommendation module never calls into `GoalModule`/`RoadmapModule`/`AssessmentModule` at runtime. `GenerateRecommendationsCommand` takes goal priority/difficulty/target date, roadmap completion/tasks/revision count, and assessment competencies/gaps/confidence/readiness directly as command input.

## 6. API

All 7 endpoints from the spec, plus 1 additional read endpoint for the history query the spec requires but gives no URL for (the same recurring gap already flagged in the Roadmap and Assessment batches):

```
POST   /recommendation/generate
GET    /recommendation/strategies   (declared before ':id' so it isn't shadowed by the :id route)
GET    /recommendation
GET    /recommendation/:id
GET    /recommendation/:id/history  (additional — backs GetRecommendationHistory)
POST   /recommendation/:id/approve
POST   /recommendation/:id/reject
DELETE /recommendation/:id          (archives — same soft-delete convention as Goal/Roadmap)
```

Guarded by `RecommendationGuard` (delegates to `JwtAuthGuard`) and `PermissionGuard` with the 5 permissions specified exactly: `Recommendation.Read`, `Recommendation.Generate`, `Recommendation.Approve`, `Recommendation.Reject`, `Recommendation.Archive`. TEACHER gets all 5; STUDENT gets `Read`/`Approve`/`Reject` (a learner can accept or dismiss a suggestion made about their own plan) but not `Generate`/`Archive`; ADMIN/SYSTEM get all.

## 7. Observability

All 5 metrics from the spec, added to the shared `MetricsService`: `recommendation_generated_total` (counter), `recommendation_duration` (histogram around `RecommendationEngine.evaluate`), `recommendation_confidence_average` (gauge, running mean, updated from the `RecommendationGenerated` event payload), `strategy_distribution_total` (counter labeled by strategy, updated from the `LearningStrategyChanged` event payload), `priority_score_average` (gauge, running mean over every generated item's `priorityScore`).

## 8. Infrastructure Reuse (no platform foundation changes)

Reused as-is: Mongoose connection, Outbox event-publishing pattern, BullMQ queue, RBAC guard/decorator, tracing/metrics services. Added a sibling `RecommendationLockService` and `RecommendationOutboxPublisherService` following the exact pattern already established by Roadmap and Assessment (cast-at-the-seam reuse of the Goal-shaped Outbox/Queue generics). `AuditLogService`'s aggregate-name derivation (generalized during the Roadmap batch) already handles `Recommendation*` events with no further change needed.

## 9. Testing

71 recommendation-specific tests (7 suites) + full `ai-backend` suite (322 tests, 54 suites) pass:

- `recommendation.engine.spec.ts` (23 tests) — determinism, explainability (every item has reason/evidence/scores/affected ids), gap handling (schedule present/absent), difficulty adjustment (increase/decrease/no-op), all 8 learning strategies individually, all 3 roadmap-adjustment triggers individually plus the healthy no-op case, dependency-blocking + reordering, priority-score bounds and monotonic response to worsening signals.
- `recommendation.aggregate.spec.ts` (9 tests) — GENERATED creation with `RecommendationGenerated` + `LearningStrategyChanged` emission, explainability at the aggregate boundary, approve/reject mutual exclusivity, archive from any non-terminal state, terminal-state rejection, optimistic-concurrency rejection, append-only history across the full lifecycle.
- `mongo-recommendation.repository.spec.ts` (MongoMemoryServer integration, 8 tests) — create/read/update/delete, items/priority-decisions/history survive save/reload, `findAll` learner filtering, stale-version rejection after reload, DB-failure propagation.
- `recommendation-command.service.lock.spec.ts` (5 tests) — event-publication order, same-input-twice determinism through the full command-service path, distributed lock acquired/released (including on failure), lock-optional backward compatibility.
- `generate-recommendations.dto.spec.ts` (7 tests) — request validation (UUID fields, ratio/score bounds, non-empty tasks array, malformed nested competency, invalid date, negative integer).
- `role-permissions.map.spec.ts` (extended, 2 new tests) — TEACHER/STUDENT authorization boundaries for all 5 new Recommendation permissions.

## 10. Deliberate Scope Boundaries

- No LLM, no embeddings, no vector database, no prompt generation, no external AI service anywhere in the engine or its import graph — confirmed by inspection of every import in `domain/engine/`.
- "Learning Resources (logical references)" are implemented as deterministic string templates (`skill:${skillArea}:${strategy}-resources`), not a resource catalog lookup or generated content — there is no resource database in scope for this batch.
- `RecommendationService`/`recommendation.service.ts` (the pre-existing facade consumed by `AiRuntimeService`) was left untouched and still exported from `RecommendationModule`, so no other module's behavior changed.
