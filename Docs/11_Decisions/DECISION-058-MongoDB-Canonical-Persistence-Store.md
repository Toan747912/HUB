# DECISION-058 — MongoDB as Canonical Persistence Store

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-07-02
- **Context:** WP-06B found two parallel "canonical" persistence tracks describing the platform: `Docs/06_Database/*` (a Postgres/Supabase schema — `snake_case` columns, RLS via `auth.uid()`, trigger-maintained history, per DECISION-042 through DECISION-045) and the actual `Apps/ai-backend/src/modules/*/infrastructure/persistence/*` implementation (MongoDB/Mongoose, `camelCase`, `aggregateVersion`, no RLS equivalent). Neither track had ever been marked as superseding the other, despite disagreeing on naming, versioning, and access-control mechanism.

---

## Context

`Apps/ai-backend` is a working NestJS service with a full test suite (55 suites / 343+ tests as of WP-06C) built entirely against MongoDB. The Postgres/Supabase track (`CanonicalSchema_v1.md`, the `DDL_ROUND*` series, the `RLS_*.md` family, `SUPABASE_AUTH_ALIGNMENT.md`) was never implemented in code. Continuing to reference both as "canonical" makes every "Canonical*" document in `Docs/06_Database/` unreliable as a source of truth for what actually runs.

## Decision

1. **MongoDB (via Mongoose) is the canonical persistence platform** for the AI Mentor OS backend, effective immediately. `Apps/ai-backend/src/modules/*/infrastructure/persistence/schemas/*.schema.ts` (currently: `goal`, `roadmap`, `assessment`, `recommendation`, `skill`, plus `outbox_events` under `src/infrastructure/outbox/`) are the authoritative schema definitions.
2. The Postgres/Supabase track is **superseded, not deleted**. The following documents remain in `Docs/06_Database/` as a historical record of what was previously decided, each now carrying a superseded-status banner pointing to this decision: `CanonicalSchema_v1.md`, `RLS_ACTOR_MODEL.md`, `RLS_BOUNDARY_MATRIX.md`, `RLS_POLICY_STRATEGY.md`, `RLS_READINESS_ASSESSMENT.md`, `RLS_RESOURCE_CLASSIFICATION.md`, `RLS_RISK_REVIEW.md`, `TABLE_SECURITY_CLASSIFICATION.md`, `SUPABASE_AUTH_ALIGNMENT.md`.
3. DECISION-042 (Postgres naming convention), DECISION-043 (Supabase Auth alignment), DECISION-044 (`version_number` versioning), and DECISION-045 (trigger-maintained history tables) are marked superseded-by-reference in `Docs/11_Decisions/README.md` — they remain historically accurate records of what was decided at the time, not deleted or rewritten.
4. Naming/versioning going forward follows the Mongo implementation's existing convention: `camelCase` document fields, `aggregateVersion: number` as the optimistic-concurrency field (not `version_number`), Mongoose `timestamps: true` (`createdAt`/`updatedAt`). Access control is enforced entirely in the NestJS application layer (JWT + RBAC, see DECISION-013 and the WP-06C security hardening batch) — there is no database-level row-security equivalent, and none is planned; this replaces the RLS-based model the superseded documents assumed.
5. Soft-delete: none of the four Mongo schemas currently implement a `deletedAt`/`isDeleted` field. This decision does not introduce one — it is flagged as an open item in `Docs/13_Platform_Consistency/PlatformStandardizationCertificationChecklist.md` for a future batch, not resolved here (adding lifecycle/deletion semantics would be a new business capability, out of WP-06C's scope).

## Consequences

- `Docs/06_Database/DatabaseBlueprint.md` and `LogicalDatabaseModel.md`'s diagrams are updated (see `Docs/13_Platform_Consistency/PlatformEventContractSpecification.md` and the persistence diagram referenced from `PlatformStandardizationImplementationReport.md`) to reflect the five Mongo collections plus the outbox collection, replacing the Postgres ER diagrams as the current reference.
- Any future schema work references the Mongo schemas in `Apps/ai-backend/src` directly as ground truth, not `Docs/06_Database/CanonicalSchema_v1.md`.
- Unique-index coverage (WP-06B found none of the four original schemas had any `unique: true` index) remains an open gap — this decision fixes *which* platform is canonical, not the completeness of its indexing, which is tracked separately.

## Related Documents
- [Docs/13_Platform_Consistency/PlatformConsistencyReport.md](../13_Platform_Consistency/PlatformConsistencyReport.md) §9 — original finding.
- [Docs/13_Platform_Consistency/ArchitectureDecisionRecords.md](../13_Platform_Consistency/ArchitectureDecisionRecords.md) PROPOSED-C — the proposal this decision accepts.
- [DECISION-042-Database-Naming-Convention-Alignment.md](DECISION-042-Database-Naming-Convention-Alignment.md), [DECISION-043-Supabase-Auth-Alignment.md](DECISION-043-Supabase-Auth-Alignment.md), [DECISION-044-Versioning-Strategy.md](DECISION-044-Versioning-Strategy.md), [DECISION-045-Temporal-Strategy.md](DECISION-045-Temporal-Strategy.md) — superseded by this decision.
