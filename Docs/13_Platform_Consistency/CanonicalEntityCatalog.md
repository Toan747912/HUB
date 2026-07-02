# Canonical Entity Catalog

**Batch:** WP-06B — Platform Consistency Review
**Scope:** Goal, Roadmap, Assessment, Recommendation (implemented) + Discovery, Evidence, Knowledge, Learning Session, Teaching (documented only)
**Status:** Review output — not a Decision. Promote entries to `11_Decisions/` only with Founder approval per `Docs/GOVERNANCE.md` §2.

This catalog inventories every concept that is referenced from more than one module (in docs and/or code) and records whether it currently has a single canonical definition.

## Legend
- **Canonical** — one definition, consistently used everywhere it appears.
- **Fragmented** — the concept exists in more than one place with different shape/values, no reconciliation.
- **Undefined** — referenced by name/prose across docs but never given a typed, owned definition.
- **Stubbed** — code fabricates placeholder values instead of sourcing a real entity.

| Entity | Status | Evidence |
|---|---|---|
| Goal | Canonical (within its own module) | `Apps/ai-backend/src/modules/goal/domain/aggregates/goal.aggregate.ts` — full DDD aggregate, immutable per DECISION-032 |
| Roadmap | Canonical (within its own module) | `Apps/ai-backend/src/modules/roadmap/domain/aggregates/roadmap.aggregate.ts` |
| Assessment | Canonical (within its own module) | `Apps/ai-backend/src/modules/assessment/domain/aggregates/assessment.aggregate.ts` |
| Recommendation | Canonical (within its own module) | `Apps/ai-backend/src/modules/recommendation/domain/aggregates/recommendation.aggregate.ts` |
| KnowledgeNode / "Skill" / "Competency" | **Fragmented** | `Docs/03_Domain_Model/KnowledgeDomain.md:14` calls `KnowledgeNode` a "skill area"; assessment module independently defines `CompetencyLevelValue` (`NOVICE..EXPERT`, `assessment/domain/value-objects/competency-level.vo.ts:1`) with no cross-reference to `KnowledgeNodeMastery` (`CoreDomainMap.md:51`, 4 levels + Teach). Three names, two unreconciled scales, no owning module in code (`knowledge.service.ts` is a 2-file stub). |
| Learning Resource | **Undefined** | Appears in prose in one report (`Docs/REVIEWS/RecommendationImplementationReport.md`) only; no domain model, no schema, no code. |
| Priority | **Fragmented (duplicated)** | `GoalPriorityValue` (`goal/domain/value-objects/goal-priority.vo.ts:1`) and `RecommendationPriorityValue` (`recommendation/domain/value-objects/recommendation-priority.vo.ts:1`) both declare identical `LOW\|MEDIUM\|HIGH\|CRITICAL` independently — no shared value object. |
| Difficulty / Complexity | **Fragmented** | `GoalDifficultyValue` = `BEGINNER..EXPERT` vs `RoadmapComplexityValue` = `LOW..VERY_HIGH` — different vocabularies for what appears to be the same axis; never reconciled in a domain doc. |
| skillArea | **Undefined / free text** | Caller-supplied string threaded through Roadmap → Assessment → Recommendation. Flagged as the top open risk in all three downstream readiness reviews (`RoadmapReadinessReview.md` §3.3, `AssessmentReadinessReview.md` §3.3, `RecommendationReadinessReview.md` §3.4). No canonical source module exists. |
| GoalId / RoadmapId / AssessmentId / RecommendationId | **Undefined as types** | All persisted and passed as plain `string` — no branded ID value objects anywhere in `Apps/ai-backend/src`. See `SharedVocabulary.md` and `CrossModuleReferenceMatrix.md`. |
| KnowledgeNodeId | **Stubbed** | `knowledge.service.ts` fabricates synthetic IDs (`kn-${goalId}-1`) instead of resolving a real persisted node. |
| Persistence platform itself | **Fragmented at the architecture level** | `Docs/06_Database/*` (Canonical Schema, DDL batches, RLS docs, DECISION-042/043/044/045) describe a **Postgres + Supabase** canonical schema (snake_case, RLS via `auth.uid()`, trigger-based `version_number`/history tables). The actual `Apps/ai-backend` is **MongoDB + Mongoose**, with its own `aggregateVersion` field and no RLS-equivalent. Two canonical tracks exist and have never been reconciled — see `PlatformConsistencyReport.md` §9. |

## Entities with no cross-module conflict (confirmed consistent)
- Role (`ADMIN/TEACHER/STUDENT/SYSTEM`, `role.enum.ts`) — single definition, consumed uniformly by RBAC.
- Permission (`Noun.Verb` enum, `permission.enum.ts`) — single definition, consistent naming convention.

## Required follow-up
See **Required migrations** and **Approved standards** sections of `PlatformConsistencyReport.md`.
