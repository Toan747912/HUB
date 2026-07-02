# Assessment Readiness Review

WP-06A — Batch 11: Assessment Intelligence Module

## 1. What Was Built

A complete deterministic learner-assessment DDD module (`Apps/ai-backend/src/modules/assessment/`), structurally mirroring the certified `modules/goal` and `modules/roadmap` modules: aggregate + entities + value objects + invariants + domain events, a pure-arithmetic `AssessmentEngine`, application commands/queries/services, Mongo persistence, an Outbox-based event publisher, a distributed lock, RBAC-guarded REST API, and observability (structured logs + Prometheus metrics). Full detail in `AssessmentImplementationReport.md`; item-by-item compliance in `AssessmentCertificationChecklist.md`.

268/268 tests pass across the whole `ai-backend` app (49 suites, no regressions), including 52 new Assessment-specific tests.

## 2. Genuine Strengths

- **Determinism is verified, not assumed** — a dedicated test evaluates two independently-constructed-but-equivalent `AssessmentInput` objects and asserts full object equality on the output, including the stability adjustment term (the one part of the formula that reads history rather than the current snapshot).
- **Confidence and readiness are legible, not opaque** — every term in the confidence formula (base, latency penalty, revision penalty, stability adjustment) is a named, independently testable function; readiness is a 3-branch decision tree with one hard override (any CRITICAL gap forces `AT_RISK` regardless of completion percentage), which is the kind of rule a human reviewer can audit without needing to trust a black box.
- **No new cross-module coupling** — `RunAssessment` takes roadmap-completion/task/revision/history signals as explicit command input rather than the Assessment module reaching into `RoadmapModule`/`GoalModule` at runtime. This follows the precedent the Roadmap module itself set (storing a `goalSnapshot` rather than calling back into Goal), and keeps the "business logic only" constraint honest.
- **History is genuinely append-only under repeated runs** — unlike Roadmap (where `RegenerateRoadmap` is the only repeatable mutation), `RunAssessment` is explicitly designed to be called many times while `COMPLETED`, and the test suite proves the history ledger grows correctly across 2+ runs both in-memory and through a Mongo save/reload cycle.

## 3. Deliberate Scope Deviations From the Spec (flagged, not silently made)

1. **`ApproveAssessment`/`ArchiveAssessment` HTTP endpoints added, not listed in the spec's API section.** The spec requires both as commands but gives no URL for either — same gap class as the Roadmap batch's `PublishRoadmap`/`RegenerateRoadmap`. Added `POST /assessment/:id/approve` and `POST /assessment/:id/archive` as the minimum surface needed to reach them at all.
2. **No domain event on approval.** The spec's fixed event list (`AssessmentCreated`, `AssessmentCompleted`, `CompetencyUpdated`, `KnowledgeGapDetected`, `AssessmentArchived`) has no `AssessmentApproved`. Approval is recorded in `AssessmentHistory` (so it's queryable and auditable via `GetAssessment`) but **no event is published to the Outbox/queue** for it. Any future consumer that reacts to domain events (e.g., a recommendation engine deciding to act only on *approved* assessments) will not see approval as an event — it would need to poll `GetAssessment` and check `status === 'APPROVED'` instead. This is the most consequential gap in this review: it was a literal reading of the spec's event list, not a design decision, and should be confirmed before anything downstream is built to react to approval.
3. **`skillArea` is a caller-supplied free-text label with no canonical source.** The engine groups tasks by whatever string the caller puts in `task.skillArea` — there is no enforced mapping back to, e.g., a `RoadmapPhase.title`. If a caller is inconsistent (different casing, renamed phases between runs), competency/gap tracking for that area will silently fragment into multiple entries instead of being recognized as the same skill over time. This is not a bug in the engine (which is correctly deterministic for whatever it's given) but a real data-quality risk at the integration boundary that whoever wires the Roadmap→Assessment pipeline needs to solve.

## 4. What Is Not Covered

- No end-to-end HTTP test (supertest) for `AssessmentController` — consistent with Goal/Roadmap's existing coverage gap, not a new regression.
- No pagination on `GET /assessment`.
- No live orchestration exists yet that actually calls `RunAssessment` with real Roadmap task-completion data — this batch delivers the engine and its API, but nothing in the codebase today automatically triggers an assessment run when a Roadmap's tasks change. That wiring is presumably a future batch's responsibility (possibly the Recommendation module, possibly a dedicated orchestrator), not implied to be in scope here, but worth naming so it isn't assumed already connected.
- Confidence/readiness thresholds (50/80/60/40, etc.) are internally consistent but, like Roadmap's duration/complexity estimates, have no real-world calibration data behind them yet — expected at this stage given the "no ML" constraint, but the numbers should be read as "coherent," not "empirically tuned."

## 5. Classification

Per the batch's provided options (`NEEDS_REVISION`, `READY_FOR_RECOMMENDATION_ENGINE`, `READY_FOR_INTELLIGENT_ASSESSMENT`):

# READY_FOR_RECOMMENDATION_ENGINE — Conditional

**Why not `NEEDS_REVISION`:** every rule, event (with the one flagged exception), command/query, API endpoint, input/output signal, and observability requirement in the spec is implemented and covered by a passing automated test; the full existing test suite (268 tests) has zero regressions; the engine cannot call an LLM, an embedding service, or any external AI service even by accident (no such dependency exists anywhere in its import graph).

**Why not an unconditional `READY_FOR_INTELLIGENT_ASSESSMENT`:** that classification implies the deterministic foundation is settled enough to layer further intelligence (richer inference, adaptive thresholds, etc.) on top. Item §3.2 (no event on approval) and §3.3 (unconstrained `skillArea` labeling) are both open questions about what the contract even guarantees to downstream consumers — building more assessment intelligence on top of a contract with an unconfirmed event surface and an unenforced grouping key risks the same class of rework the Roadmap review flagged for its own open `UpdateRoadmap` question. Recommendation-engine integration is a better-bounded next step: a recommendation engine can safely start from `GetCompetencyProfile`/`GetKnowledgeGaps` (both fully specified, tested, and stable) without needing §3.2/§3.3 resolved first, since recommendations would read the *result* of an assessment, not react to its lifecycle events.

**Condition to move to `READY_FOR_INTELLIGENT_ASSESSMENT`:** confirm whether approval should emit a domain event, and establish a canonical `skillArea` source (e.g., require it be a `RoadmapPhase.id`, not a free-text title) before building further intelligence on top of this module's contracts.
