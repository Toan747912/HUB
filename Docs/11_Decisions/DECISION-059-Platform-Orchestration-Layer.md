# DECISION-059 — Platform Orchestration Layer

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-07-02
- **Context:** WP-06B found no live orchestration existed anywhere in the codebase — `goal/orchestration/` was empty, and a repo-wide search for `EventEmitter2`/`@OnEvent`/`EventBus` returned zero matches. Domain events were persisted to the outbox and relayed via BullMQ, but nothing in-process consumed them, so a Goal change never propagated to Roadmap, Assessment, or Recommendation automatically, despite Roadmap → Assessment → Recommendation being presented as a dependent chain in every module's readiness review.

---

## Context

DECISION-028 defines Learning Session as an orchestrator over Goal/Roadmap/Knowledge/Evidence/Assessment/Recommendation. Building that orchestrator on a platform with zero existing precedent for cross-module event consumption would mean inventing the pattern and the business capability simultaneously — this decision separates the two, establishing the *mechanism* now without adding new business logic.

## Decision

1. `Apps/ai-backend/src/modules/orchestration/` hosts a single `OrchestrationWorkerService` that registers itself as an in-process handler on the existing shared `QueueService` (via a new `QueueService.registerHandler()` extension point) rather than opening a second BullMQ `Worker` on the same queue name — two independent `Worker` instances on one queue name are competing consumers in BullMQ and would each see only a subset of events, silently dropping triggers. This guarantees every relayed event is seen by orchestration exactly once.
2. The orchestration layer is **strictly event-driven and never touches another module's aggregate or repository directly.** It reacts to relayed domain events by calling the target module's own existing **application-layer command service** (e.g. `RoadmapCommandService.invalidateRoadmap(...)`), which is the only thing permitted to call that module's aggregate. Cross-module lookups (e.g. "which Roadmaps belong to this Goal") go through that module's own **query service**, never a raw repository/collection access from orchestration.
3. The propagation mechanism is a **staleness flag**, not a new business rule: each of `Roadmap`, `Assessment`, `Recommendation` gained an `invalidatedAt: Date | null` field and an `invalidate(reason, context)` aggregate method, orthogonal to that aggregate's existing status state machine (no new status values were added, no existing lifecycle transition was changed). `GoalUpdated`/`GoalCompleted`/`GoalArchived`-class events trigger `Roadmap.invalidate()` for every Roadmap referencing that Goal; a resulting `RoadmapUpdated`/`RoadmapPublished`/`RoadmapRegenerated`/`RoadmapInvalidated` triggers `Assessment.invalidate()`; a resulting Assessment event triggers `Recommendation.invalidate()`. What "regeneration" means in response to being flagged stale is explicitly **not** decided here — that is deferred to whichever future capability (e.g. Learning Session) consumes the flag.

## Consequences

- A Goal status change now propagates a staleness signal through Roadmap → Assessment → Recommendation automatically, closing the "no live orchestration" gap WP-06B identified — without introducing any new automated regeneration/replanning behavior, which remains a future decision.
- Any future module needing to react to upstream changes should follow this same pattern (register a handler via `QueueService`, call the target module's own command/query services, never reach into another module's aggregate/repository) rather than inventing a new mechanism.
- `PLATFORM_ORCHESTRATION_QUEUE` was reserved in `queue.config.ts` but is currently unused — the in-process handler-registration approach made a second dedicated queue unnecessary for this batch; it remains available if a future need for a genuinely separate queue (e.g. different retry/backoff policy) arises.

## Related Documents
- [Docs/13_Platform_Consistency/PlatformStandardizationImplementationReport.md](../13_Platform_Consistency/PlatformStandardizationImplementationReport.md)
- [DECISION-028-Learning-Session-Domain.md](DECISION-028-Learning-Session-Domain.md) — the future consumer this mechanism is built ahead of.
- [DECISION-056-Canonical-Typed-Identifiers.md](DECISION-056-Canonical-Typed-Identifiers.md), [DECISION-035-No-Full-Event-Sourcing.md](DECISION-035-No-Full-Event-Sourcing.md) — related infrastructure decisions this mechanism builds on (outbox/event metadata, no event sourcing).
