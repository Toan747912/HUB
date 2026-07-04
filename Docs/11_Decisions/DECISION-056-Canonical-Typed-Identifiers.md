# DECISION-056 — Canonical Typed Identifiers

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-07-02
- **Context:** WP-06B (Platform Consistency Review) found that every cross-module identifier (`goalId`, `roadmapId`, `assessmentId`, `recommendationId`, `learnerId`) was a plain `string` throughout `Apps/ai-backend/src`, with no branded type distinguishing one kind of ID from another. `Recommendation`'s aggregate constructor took four consecutive `string` parameters — a transposition bug (passing a `roadmapId` where an `assessmentId` was expected) would type-check silently.

---

## Context

WP-06B's Cross-Module Identity Review confirmed no branded ID types existed anywhere in the codebase, and that this was a genuine, not theoretical, defect risk given the number of same-shaped string parameters passed positionally across aggregate constructors and application services.

## Decision

1. `Apps/ai-backend/src/shared/domain/identifiers/` hosts an abstract `Identifier<Brand extends string>` base class (immutable, value-object equality via `.equals()`, `.toString()`/`.toJSON()` for serialization) and one concrete branded subclass per identifier kind: `GoalId`, `RoadmapId`, `AssessmentId`, `RecommendationId`, `LearnerId`, `TaskId`, `MilestoneId`, `PhaseId`, `SkillId`.
2. Typed identifiers are used in the **domain layer** (aggregates, domain events' metadata, domain entities referencing another aggregate's identity). Application-layer DTOs, interface-layer request/response DTOs, and Mongoose persistence schemas remain plain `string` — no data migration is required. Conversion happens at exactly two boundaries: the interface layer (parsing raw request strings into typed IDs) and the infrastructure layer (persistence mappers converting typed ID ↔ string at the aggregate↔document boundary).
3. Domain event **payloads** keep primitive `string` ID fields (serialized via `.toString()`), consistent with the pre-existing "IDs only, not fat objects" payload convention. Domain event **metadata** (`aggregateId` and per-module cross-references) uses typed IDs.

## Consequences

- Eliminates the constructor-argument-transposition risk identified in WP-06B for `Recommendation` and any future aggregate with multiple ID-shaped parameters.
- No database migration was required — Mongo documents are unaffected; only the TypeScript domain layer changed shape.
- Every module implemented against this pattern (`goal`, `roadmap`, `assessment`, `recommendation`, and the new `skill` catalog module) must continue to place identifier conversion only at the two documented boundaries — introducing a raw string ID inside a domain aggregate/entity going forward is a regression against this decision.

## Related Documents
- [Docs/13_Platform_Consistency/TypedIdentifierSpecification.md](../13_Platform_Consistency/TypedIdentifierSpecification.md)
- [Docs/13_Platform_Consistency/CrossModuleReferenceMatrix.md](../13_Platform_Consistency/CrossModuleReferenceMatrix.md)
- [Docs/13_Platform_Consistency/ArchitectureDecisionRecords.md](../13_Platform_Consistency/ArchitectureDecisionRecords.md) — original WP-06B proposal (PROPOSED-A) that this decision accepts and implements.
