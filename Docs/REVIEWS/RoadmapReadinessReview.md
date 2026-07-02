# Roadmap Readiness Review

WP-06A — Batch 10: Roadmap Intelligence Module

## 1. What Was Built

A complete Goal → Roadmap DDD module (`Apps/ai-backend/src/modules/roadmap/`), structurally mirroring the existing, already-certified `modules/goal` module: aggregate + entities + value objects + invariants + domain events, a deterministic `RoadmapPlanningEngine`, application commands/queries/services, Mongo persistence, an Outbox-based event publisher, a distributed lock, RBAC-guarded REST API, and observability (structured logs + Prometheus metrics). Full detail in `RoadmapImplementationReport.md`; item-by-item compliance in `RoadmapCertificationChecklist.md`.

231/231 tests pass across the whole `ai-backend` app (44 suites, no regressions), including 46 new Roadmap-specific tests plus one incidental fix to `AuditLogService` (see §4).

## 2. Genuine Strengths

- **Determinism is real, not asserted** — `RoadmapPlanningEngine` has zero external calls, zero `Math.random`/`Date.now`-derived branching in its output shape, and a test asserts byte-identical output for identical input.
- **Dependency ordering is verifiable** — every task in a roadmap forms a single linear chain (`dependsOn: [previousTaskId]`), checked structurally in a test rather than just documented.
- **Versioning is genuinely append-only** — verified across two independent layers: in-memory aggregate test and a MongoMemoryServer round-trip (save → reload → revision list unchanged in order and count).
- **No coupling to Goal at runtime** — the planner input (`goalSnapshot`) is captured once at `CreateRoadmap` time and stored on the aggregate; `RegenerateRoadmap` re-runs the planner from that stored snapshot, so the Roadmap module never calls back into `GoalModule`. This keeps the "only Goal → Roadmap transformation" constraint honest even after the initial creation.

## 3. Deliberate Scope Deviations From the Spec (flagged, not silently made)

1. **`CompleteRoadmapTask` command/endpoint added, not in the spec's command list.** The spec requires a "Progress Model" as Output and a `GetRoadmapProgress` query, but lists no command that ever changes progress. Without a mutation path, progress would be permanently `0`. Added `CompleteRoadmapTaskCommand` + `POST /roadmap/:id/tasks/:taskId/complete` as the minimum viable mechanism — a task-level "done" toggle, nothing richer (no partial-credit, no time-tracking). This is a genuine scope addition and should be confirmed by whoever owns the Roadmap spec, not treated as pre-approved.
2. **`RoadmapCompleted` is auto-emitted, not command-driven.** The spec's event list includes `RoadmapCompleted` but the command list has no `CompleteRoadmap`. Implemented as an automatic transition: when the last task in a `PUBLISHED` roadmap is marked complete, `completionRatio` hits 100 and the aggregate self-transitions to `COMPLETED` and emits the event. This is a reasonable reading of the spec but is an inferred behavior, not an explicit one — worth confirming.
3. **`UpdateRoadmap` does not re-plan.** It accepts an arbitrary `changes: Record<string, unknown>` bag, bumps the version, appends an `UPDATED` revision, and emits `RoadmapUpdated` — but it does **not** recompute phases/milestones/tasks. Only `RegenerateRoadmap` re-invokes the planning engine. If the intent of `UpdateRoadmap` was "the Goal's constraints/target date changed, please replan," this implementation does not do that — it is closer to an annotation/audit-trail update. This is the most consequential open question in this review.

## 4. Incidental Fix to Shared Infrastructure

`AuditLogService.recordFromDomainEvent` hardcoded `resource: 'Goal:${aggregateId}'` for every domain event, regardless of which module raised it. Reusing it unmodified for Roadmap events would have silently mislabeled every Roadmap audit entry as `Goal:...` in the audit trail — a real correctness bug, not a hypothetical one, since Roadmap events pass through the exact same `AuditLogService` via `RoadmapOutboxPublisherService`. Fixed to derive the aggregate name from the event type's leading capitalized word (all event types follow `<Aggregate><Action>`, e.g. `GoalCreated`, `RoadmapPublished`). No signature change; all pre-existing Goal/Audit tests still pass unmodified. This is the only change made outside `modules/roadmap/`, `infrastructure/locks/`, `infrastructure/observability/metrics.service.ts`, and the RBAC permission files — i.e., the "no changes to platform foundation" constraint was honored except for this one necessary bug fix directly triggered by reusing shared infra for a second aggregate.

## 5. What Is Not Covered

- No end-to-end HTTP test (supertest) for `RoadmapController` — consistent with the existing `GoalController`'s test coverage (also untested at the HTTP layer), so this is not a regression relative to the reference module, but it is a real gap either module could still have.
- No pagination on `GET /roadmap` or `GET /roadmap/:id/history` — acceptable for an MVP batch, will not scale to a learner with hundreds of roadmaps/revisions.
- `RoadmapComplexity`/`EstimatedDuration` are internally consistent but not validated against any real-world calibration data (no historical completion-time dataset exists yet to check estimation accuracy against) — this is expected at this stage (spec explicitly forbids ML/LLM here) but should not be read as "the numbers are meaningful," only "the numbers are deterministic and internally coherent."

## 6. Classification

Per the batch's provided options (`NEEDS_REVISION`, `READY_FOR_ASSESSMENT_MODULE`, `READY_FOR_INTELLIGENT_PLANNING`):

# READY_FOR_ASSESSMENT_MODULE — Conditional

**Why not `NEEDS_REVISION`:** every explicit rule, event, command/query, API endpoint, and observability requirement in the spec is implemented and covered by a passing automated test; the full existing test suite (231 tests) has zero regressions; the module cannot call an LLM even by accident (no such dependency exists in its import graph).

**Why not an unconditional `READY_FOR_INTELLIGENT_PLANNING`:** that classification implies the deterministic foundation is settled enough to layer AI-assisted planning on top of it. Item §3.3 (`UpdateRoadmap` not re-planning) is a real ambiguity about what the Update contract is even supposed to mean — building intelligent (LLM-assisted) planning on top of an update contract whose semantics are still unconfirmed risks the same rework class of issue the Discovery module review (`DiscoveryReadinessReview.md`) flagged for schema drift. Assessment-module integration (scoring/marking tasks as verified, not just self-reported "complete") is a smaller, better-bounded next step that does not depend on resolving §3.3 first.

**Condition to move to `READY_FOR_INTELLIGENT_PLANNING`:** confirm or revise the three scope deviations in §3 — particularly whether `UpdateRoadmap` should trigger re-planning — before any LLM-assisted planning layer is designed on top of this module's contracts.
