# Cross-Module Reference Matrix

**Batch:** WP-06B — Platform Consistency Review
**Scope:** `Apps/ai-backend/src/modules/{goal,roadmap,assessment,recommendation}` (the only modules with real cross-module references today)

## Reference matrix

| Referencing module | References | ID type in code | Location |
|---|---|---|---|
| Roadmap | `goalId` | free-text `string` | `roadmap/domain/aggregates/roadmap.aggregate.ts:31,51,59,66,83,275` |
| Assessment | `goalId`, `roadmapId` | free-text `string` (DTO only, not on aggregate) | `assessment/interface/controllers/assessment.controller.ts:51-53,68` |
| Recommendation | `goalId`, `roadmapId`, `assessmentId`, `learnerId` | free-text `string` | `recommendation/domain/aggregates/recommendation.aggregate.ts:31-32,51-52,57,79,101-102,123,128,132,235-236` |

No branded ID types exist anywhere (`grep class GoalId\|RoadmapId\|AssessmentId\|LearnerId` → zero matches). `Recommendation`'s constructor takes four consecutive `string` parameters (`recommendationId, goalId, roadmapId, assessmentId`) — transposing two arguments would type-check without error.

## Persistence-layer confirmation

`recommendation.schema.ts:88-90` — `goalId`, `roadmapId`, `assessmentId` stored as unconstrained Mongoose `String`, no format validation, no existence check against the referenced collection.

## Aggregate boundary integrity

- **Direct cross-aggregate writes:** none found. No file under `modules/{goal,roadmap,assessment,recommendation}` imports another module's aggregate/repository/service (`grep "from '../../<module>/'"` → zero matches).
- **Circular module imports:** none found. Each `*.module.ts` only imports shared infrastructure (Outbox, Queue, Audit, Telemetry, Locks) plus its own providers.
- **Composition point:** `ai-runtime.service.ts:6-14` injects all four domain services directly (hub-and-spoke), not a module-to-module import — this is the one place that "knows about" every module.

## `DomainBoundaryGuardService` — what it actually enforces

`Apps/ai-backend/src/shared/services/domain-boundary-guard.service.ts:5-14`: `enforceNoCrossDomainWrite(routeDomain, attemptedWrites)` throws if any entry in `attemptedWrites` differs from `routeDomain`. Both inputs are **caller-supplied request fields** (`ai-runtime.service.ts:40`, `dto.route`, `dto.attempted_writes ?? []`) — the guard does not inspect actual repository writes, aggregate mutations, or collection names. It is a self-reported/opt-in check, not a structural enforcement mechanism, and is only invoked from `ai-runtime.service.ts`.

## Verdict

Module isolation at the code-boundary level (imports, writes) is good — matches `Domain_Boundary_Matrix.md`'s event-based-interaction intent. Two drifts from documentation:

1. **Soft-FK contract not implemented.** `Cross_Domain_FK_Strategy.md` requires an identifier-format contract and existence-validation strategy for cross-module references; the current implementation is untyped strings with no validation.
2. **`DomainBoundaryGuardService` is not the boundary guarantee the docs assume.** `Domain_Boundary_Matrix.md` §5.1 implies "strict write-owner enforcement in repositories/services"; the actual guard only validates client-declared metadata on one endpoint, not real write paths.

## Recommendation

Promote `GoalId`, `RoadmapId`, `AssessmentId`, `RecommendationId`, `LearnerId` to branded value objects (see `SharedVocabulary.md`) before adding a Learning Session Engine that will consume all four IDs simultaneously — the transposition risk compounds with every new consumer.
