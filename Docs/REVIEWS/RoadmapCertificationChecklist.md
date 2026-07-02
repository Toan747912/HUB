# Roadmap Certification Checklist

WP-06A — Batch 10: Roadmap Intelligence Module

Legend: ✅ done and verified by an automated test · ☑ done, verified by build/inspection (no dedicated test) · ⚠ partial / deliberate scope limitation

## Domain Model

- ✅ Aggregate Root `Roadmap`
- ✅ Entities: `RoadmapPhase`, `RoadmapMilestone`, `RoadmapTask`, `RoadmapRevision`
- ✅ Value Objects: `RoadmapStatus`, `RoadmapComplexity`, `EstimatedDuration`, `PriorityWeight`

## Application

- ✅ Commands: `CreateRoadmap`, `UpdateRoadmap`, `ArchiveRoadmap`, `PublishRoadmap`, `RegenerateRoadmap`
- ☑ Additional command: `CompleteRoadmapTask` (drives Progress Model / `RoadmapCompleted`, not in the spec's command list but required to make progress observable without an assessment engine)
- ✅ Queries: `GetRoadmap`, `GetRoadmaps`, `GetRoadmapProgress`, `GetRoadmapHistory`

## Intelligence Engine (`RoadmapPlanningEngine`)

- ✅ Goal decomposition (phase/milestone/task generation from `PlanningInput`)
- ✅ Dependency ordering (linear chain across the whole roadmap)
- ✅ Milestone generation
- ✅ Duration estimation
- ✅ Complexity estimation
- ✅ Priority balancing
- ✅ No LLM used anywhere in the planning path
- ✅ Deterministic (verified: identical input → identical output)

## Rules

- ✅ Every roadmap contains phases (enforced by `ensureNonEmptyPlan`, thrown as `ROADMAP_PLAN_EMPTY` if violated)
- ✅ Every phase contains milestones (same invariant)
- ✅ Every milestone contains ordered tasks (same invariant)
- ✅ Reproducible (planning engine is pure — no randomness, no wall-clock/goalId-derived entropy beyond deterministic id templating)
- ✅ Versioned (see Versioning section)

## Versioning

- ✅ `RoadmapVersion`/`RoadmapRevision` is append-only — verified by unit test (revision count grows, never shrinks) and integration test (revisions survive save/reload in original order)
- ✅ No overwrite — `regenerate()` calls `appendRevision`, never mutates or replaces existing `RoadmapRevision` entries

## Events

- ✅ `RoadmapCreated`
- ✅ `RoadmapUpdated`
- ✅ `RoadmapPublished`
- ✅ `RoadmapArchived`
- ✅ `RoadmapCompleted`
- ✅ `RoadmapRegenerated`

## API

- ✅ `POST /roadmap`
- ✅ `GET /roadmap`
- ✅ `GET /roadmap/:id`
- ✅ `PUT /roadmap/:id`
- ✅ `DELETE /roadmap/:id` (archives — matches the Goal module's convention where DELETE performs a soft-archive, not a hard delete)
- ✅ `POST /roadmap/:id/publish`
- ✅ `POST /roadmap/:id/regenerate`
- ☑ `GET /roadmap/:id/progress`, `GET /roadmap/:id/history` — additional endpoints backing the `GetRoadmapProgress`/`GetRoadmapHistory` queries the spec requires but doesn't list a URL for
- ☑ `POST /roadmap/:id/tasks/:taskId/complete` — additional endpoint; without it the Progress Model had no HTTP-reachable mutation path (caught during self-review, added before certification)

## Observability

- ✅ Metric `roadmap_created_total`
- ✅ Metric `roadmap_regenerated_total`
- ✅ Metric `roadmap_generation_duration`
- ✅ Logs carry `traceId`
- ✅ Logs/events carry `roadmapId` (as `aggregateId`)
- ✅ Events carry `goalId`
- ✅ Events carry `plannerVersion`

## Testing

- ✅ Goal → Roadmap (creation test + command-service end-to-end test)
- ✅ Milestone ordering (every milestone has ≥1 task, verified structurally)
- ✅ Dependency ordering (linear chain assertion across all tasks)
- ✅ Progress calculation (completion ratio recompute + auto-transition to COMPLETED at 100%)
- ✅ Version history (append-only, survives persistence)
- ✅ Regeneration (new plan replaces phases, revision appended, event emitted)
- ✅ Authorization (RBAC boundary tests for all 5 new permissions across TEACHER/STUDENT)
- ✅ Validation (DTO-level class-validator tests: UUID, required fields, array/date shape)

## Constraints Compliance

- ✅ Do NOT integrate any LLM — confirmed, `RoadmapPlanningEngine` has zero external calls
- ✅ Planning must be deterministic — confirmed by reproducibility test
- ✅ No AI prompt generation — confirmed, no prompt-construction code exists in this module
- ✅ No recommendation engine — confirmed, `RecommendationModule` untouched
- ✅ No assessment engine — confirmed, `AssessmentModule` untouched
- ✅ Only Goal → Roadmap transformation — confirmed, the module reads a Goal-shaped snapshot but never calls into `GoalModule` at runtime (snapshot is captured once at creation and reused for regeneration)

## Test Suite Health (full repo)

- ✅ `npm run build` (tsc) — clean, zero errors
- ✅ `npx jest` — 231/231 tests passing across 44 suites (includes all pre-existing Goal/Discovery/Audit/RBAC/Outbox suites — no regressions)
