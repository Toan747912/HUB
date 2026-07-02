# Shared Platform Vocabulary

**Batch:** WP-06B — Platform Consistency Review
**Purpose:** Define the canonical identifier and value vocabulary the platform *should* converge on. This is a proposal for Founder approval, not yet a Decision — see `ArchitectureDecisionRecords.md`.

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

## Value vocabulary (enums that should be shared, currently duplicated)

| Canonical name | Current instances | Conflict |
|---|---|---|
| `Priority` | `GoalPriorityValue`, `RecommendationPriorityValue` | Identical value sets (`LOW/MEDIUM/HIGH/CRITICAL`), declared twice — should be one shared value object. |
| `Difficulty` (proposed unifying name) | `GoalDifficultyValue` (`BEGINNER..EXPERT`), `RoadmapComplexityValue` (`LOW..VERY_HIGH`) | Different scales, unclear if same axis — needs an explicit decision on whether these are the same concept before merging. |
| `CompetencyLevel` | `CompetencyLevelValue` (assessment module only) vs `KnowledgeNodeMastery` (doc concept, `CoreDomainMap.md:51`) | Two 4-5 level scales for what docs describe as the same "how well is this known" concept — never reconciled. |

## `skillArea` — highest-priority undefined concept

`skillArea` is a plain string passed from Roadmap into Assessment and Recommendation. All three module readiness reviews (`RoadmapReadinessReview.md`, `AssessmentReadinessReview.md`, `RecommendationReadinessReview.md`) independently flag it as unresolved and as the top blocker to a canonical vocabulary. It has no owning module, no format contract, and no relationship declared to `KnowledgeNode`/`Skill`/`CompetencyLevel`. This is the single highest-value item to resolve before further business capability work, because every downstream module (including a future Learning Session Engine) inherits whatever is decided here.

## Persistence-track vocabulary (platform-level)

Two parallel "canonical" tracks currently exist and disagree:

1. `Docs/06_Database/*` — Postgres/Supabase track: `snake_case` columns, `version_number` (DECISION-044), RLS via `auth.uid()` (DECISION-043), trigger-maintained history tables (DECISION-045).
2. `Apps/ai-backend/src/modules/*/infrastructure/persistence/*` — MongoDB/Mongoose track: `camelCase` fields, `aggregateVersion`, no RLS equivalent, no soft-delete field, `timestamps: true` (createdAt/updatedAt only).

Neither track has been marked as superseding the other. See `PlatformConsistencyReport.md` §9 for the recommended resolution path.
