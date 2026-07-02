# Shared Platform Vocabulary

**Batch:** WP-06B — Platform Consistency Review (original proposal); updated by **WP-06C Phase 6 — Canonical Vocabulary (Workstream C)** with the as-built state.
**Purpose:** Define the canonical identifier and value vocabulary the platform converges on. The Value vocabulary section below now reflects what has actually been implemented under `Apps/ai-backend/src/shared/domain/vocabulary/`, not just a proposal — see `ArchitectureDecisionRecords.md` for the identifier-vocabulary decisions (still pending/tracked separately).

## Identifier vocabulary

| Canonical name | Current representation | Target representation | Owning module (proposed) |
|---|---|---|---|
| `GoalId` | plain `string` (`goal.aggregate.ts:43`) | branded/opaque ID value object, UUID-formatted | goal |
| `RoadmapId` | plain `string` (`roadmap.aggregate.ts:78`) | branded ID value object | roadmap |
| `AssessmentId` | plain `string` (DTO field, `assessment.controller.ts:51`) | branded ID value object | assessment |
| `RecommendationId` | plain `string` (`recommendation.aggregate.ts:119`) | branded ID value object | recommendation |
| `LearnerId` | plain `string`, no dedicated type | branded ID value object | shared/identity (external — see DECISION-043 `learner.id = auth.users.id`) |
| `KnowledgeNodeId` | **stubbed**, fabricated strings (`knowledge.service.ts:5`) | branded ID value object, resolved from a real Knowledge module | knowledge (not yet implemented beyond stub) |
| `SkillId` / `CompetencyId` | **does not exist** — see `skillArea` free text and `CompetencyLevelValue` below | one canonical entity + ID, replacing both `skillArea` string and any ad hoc competency references | knowledge (proposed single owner) |
| `RoadmapPhaseId` | not found as a distinct entity — roadmap nodes are referenced ad hoc | branded ID value object if roadmap phases are to be individually addressable (used today only inside `roadmap.aggregate.ts` internals) | roadmap |

## Value vocabulary — as-built (WP-06C Phase 6)

`Apps/ai-backend/src/shared/domain/vocabulary/` is the canonical package for platform-level value objects. Every module listed below imports its value object from this package instead of declaring a module-local duplicate.

| Canonical name | File | Consolidates / replaces | Modules referencing it |
|---|---|---|---|
| `Priority` (`PriorityValue`) | `shared/domain/vocabulary/priority.vo.ts` | `GoalPriority`/`GoalPriorityValue` (goal, deleted) and `RecommendationPriority`/`RecommendationPriorityValue` (recommendation, deleted) — identical `LOW/MEDIUM/HIGH/CRITICAL` sets. Kept `RecommendationPriority`'s `fromScore()` helper since it was the more complete of the two APIs. | goal, recommendation |
| `Confidence` | `shared/domain/vocabulary/confidence.vo.ts` | `ConfidenceScore` (assessment, deleted) and `RecommendationConfidence` (recommendation, deleted) — identical 0-100 numeric value objects. | assessment, recommendation |
| `CompetencyLevel` (`CompetencyLevelValue`) | `shared/domain/vocabulary/competency-level.vo.ts` | Relocated as-is from `assessment/domain/value-objects/competency-level.vo.ts` (no other module had a duplicate definition to merge). Positioned here so a future module (e.g. a Learning Session engine) can reference the same 5-level `NOVICE..EXPERT` scale instead of redefining it. | assessment today; available platform-wide |
| `LearningStrategy` (`LearningStrategyValue`) | `shared/domain/vocabulary/learning-strategy.vo.ts` | Relocated as-is from `recommendation/domain/value-objects/learning-strategy.vo.ts` (no duplicate existed). Same rationale as `CompetencyLevel`: positioned as a platform-level definition for future reuse. | recommendation today; available platform-wide |

### Deliberately kept separate (not merged)

These pairs look superficially similar but represent genuinely different concepts, or are not simple value objects, and were kept apart on purpose so this isn't mistaken for an oversight later:

- **`GoalDifficultyValue`** (`goal/domain/value-objects/goal-difficulty.vo.ts`, `BEGINNER..EXPERT`) vs **`RoadmapComplexityValue`** (`roadmap/domain/value-objects/roadmap-complexity.vo.ts`, `LOW..VERY_HIGH`) — `GoalDifficulty` rates how hard a *learner's goal* is to achieve; `RoadmapComplexity` rates how complex a *generated plan* is to execute. Different scales, different subjects, different owning aggregates. Left untouched in both location and content.
- **`GoalProgress`** (`goal/domain/entities/goal-progress.entity.ts`) vs **`RoadmapProgress`** (`roadmap/domain/entities/roadmap-progress.entity.ts`) — structurally similar (`completionRatio` + an ID list + `updatedAt`), but the ID lists track different things: `reachedMilestoneIds` (goal milestones) vs `completedTaskIds` (roadmap tasks), each validated by its own module-specific domain error (`GoalDomainError` vs `RoadmapDomainError`). Both are entities, not simple value objects, and each is scoped to its own aggregate's lifecycle. Consistent with the Difficulty/Complexity precedent above, these were kept as two separate types rather than forced into one shared "Progress" abstraction that would blur which milestones/tasks a given ratio refers to.
- **`KnowledgeGap`** (`assessment/domain/entities/knowledge-gap.entity.ts`) — audited and confirmed to be a domain **entity** (has an `id`, `skillId`, `weight`, `reason`), not a simple value object like the terms above. Left in `assessment` rather than force-relocated into the vocabulary package, which is scoped to value objects.
- **`Readiness`** — searched the codebase (`grep -rn -i readiness src`); no dedicated `Readiness` value-object class exists anywhere. `readiness` appears only as a plain `ReadinessLevel = 'READY' | 'AT_RISK' | 'NOT_READY'` string field inside the assessment module's engine types/entities, passed as a plain `string` across the assessment → recommendation boundary (never as a shared class). There is no code-level "Readiness" concept to consolidate; introducing one now would be a new business capability, which is out of scope for this phase.

## `skillArea` — highest-priority undefined concept

`skillArea` is a plain string passed from Roadmap into Assessment and Recommendation. All three module readiness reviews (`RoadmapReadinessReview.md`, `AssessmentReadinessReview.md`, `RecommendationReadinessReview.md`) independently flag it as unresolved and as the top blocker to a canonical vocabulary. It has no owning module, no format contract, and no relationship declared to `KnowledgeNode`/`Skill`/`CompetencyLevel`. This is the single highest-value item to resolve before further business capability work, because every downstream module (including a future Learning Session Engine) inherits whatever is decided here.

## Persistence-track vocabulary (platform-level)

Two parallel "canonical" tracks currently exist and disagree:

1. `Docs/06_Database/*` — Postgres/Supabase track: `snake_case` columns, `version_number` (DECISION-044), RLS via `auth.uid()` (DECISION-043), trigger-maintained history tables (DECISION-045).
2. `Apps/ai-backend/src/modules/*/infrastructure/persistence/*` — MongoDB/Mongoose track: `camelCase` fields, `aggregateVersion`, no RLS equivalent, no soft-delete field, `timestamps: true` (createdAt/updatedAt only).

Neither track has been marked as superseding the other. See `PlatformConsistencyReport.md` §9 for the recommended resolution path.
