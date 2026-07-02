# Architecture Decision Records — Proposed (WP-06B Output)

**Status of this file:** These are **proposed** decisions surfaced by the WP-06B consistency review. None are Accepted/Locked. Per `Docs/GOVERNANCE.md` §2, only the Founder may approve a decision into `Docs/11_Decisions/`. This file is the intake queue for that process — each item below should become its own `DECISION-0XX-*.md` if and when approved, continuing the existing numbering (next free number after DECISION-055).

This batch is **review only** — no code, no schema rewrite, no new decisions were created or unlocked.

---

## PROPOSED-A — Canonical ID Value Objects

**Problem:** `GoalId`, `RoadmapId`, `AssessmentId`, `RecommendationId`, `LearnerId` are all plain `string` in code, with no branded type distinguishing them. `RecommendationAggregate`'s constructor takes four consecutive string parameters — a transposition bug would type-check.
**Options:** (a) introduce branded/opaque ID value objects per module, shared via a `shared-kernel` folder; (b) accept the risk and rely on tests only.
**Recommendation:** (a). Low cost, removes an entire bug class before a Learning Session Engine becomes the fifth consumer of these four IDs at once.

## PROPOSED-B — Canonical `skillArea` / Skill-Competency Entity

**Problem:** `skillArea` is caller-supplied free text, threaded Roadmap → Assessment → Recommendation with no canonical source. Independently, `CompetencyLevelValue` (assessment) and `KnowledgeNodeMastery` (docs) describe overlapping "how well is this known" concepts without reconciliation. All three downstream readiness reviews name this as their top blocker.
**Options:** (a) make `KnowledgeNode` the single canonical skill/competency entity and require Roadmap/Assessment/Recommendation to reference `knowledgeNodeId` instead of a free-text `skillArea`; (b) keep `skillArea` as an interim free-text field but add a validation/normalization service; (c) leave as-is.
**Recommendation:** (a), but this is a genuine architecture decision (not a review call) — route to Founder/Lead Architect per existing DECISION-024 (Concept = KnowledgeNode) which already implies this direction but was never extended to Roadmap/Assessment/Recommendation's `skillArea` field.

## PROPOSED-C — Persistence Track Reconciliation (Postgres/Supabase docs vs. MongoDB implementation)

**Problem:** `Docs/06_Database/*` (CanonicalSchema_v1, DDL batches, RLS docs, DECISION-042/043/044/045) describe a Postgres + Supabase canonical schema. The actual `Apps/ai-backend` implementation is MongoDB + Mongoose, with different versioning field names (`aggregateVersion` vs. `version_number`), no RLS equivalent, and no soft-delete field. Neither track has been marked superseded.
**Options:** (a) formally supersede the Postgres/Supabase track with a new decision documenting Mongo as the accepted persistence platform, and mark `RLS_*.md`, `CanonicalSchema_v1.md`, DECISION-042/043/044/045 as historical/superseded; (b) treat Mongo as an interim implementation and plan a migration back to Postgres; (c) maintain both intentionally (not recommended — no evidence this was ever the intent).
**Recommendation:** (a) if Mongo is in fact the intended production platform (it is what's built and has tests/CI around it). This is the single largest documentation/reality gap found in this review and should be resolved before any further schema-adjacent work, since every "Canonical*" doc currently points at the wrong platform.

## PROPOSED-D — Event Catalog Reconciliation

**Problem:** Documented event names (`GoalDefined`, `AssessmentResultCreated`/`AssessmentComputed`, `RecommendationProposed`) do not match implemented event names (`GoalCreated`, `AssessmentCreated`/`AssessmentCompleted`, `RecommendationGenerated`), and `EVENT_CATALOG.md` and `Event_Ownership_Matrix.md` disagree with each other in places. Over half of documented events (Discovery, Evidence, Knowledge, Learning Session, Teaching) are entirely unimplemented.
**Options:** (a) re-run `EVENT_CATALOG.md`/`Event_Ownership_Matrix.md` against actual code as the source of truth and correct the docs; (b) treat docs as target and rename code to match before further event-consuming work.
**Recommendation:** (a) for the four implemented modules (code is closer to a working system and has tests); explicitly mark Discovery/Evidence/Knowledge/Learning-Session/Teaching events as **not yet implemented** rather than implying they exist.

## PROPOSED-E — Outbox Envelope: Correlation/Causation Persistence

**Problem:** In-memory domain events carry `traceId`/`correlationId`/`causationId`, but `OutboxRepository.doSaveMany` only persists `eventId/aggregateId/aggregateVersion/eventType/payload/occurredAt` — these fields are dropped. `OutboxRelayService.toDomainEvent` then fabricates `correlationId`/`causationId` as the event's own `eventId` for anything relayed through the durable-retry path, silently severing the causal chain for exactly the failure scenario the outbox exists to survive.
**Options:** (a) add `traceId`/`correlationId`/`causationId` columns to `outbox-event.schema.ts` and persist them; (b) accept the gap for now.
**Recommendation:** (a). Small, contained schema addition; high value for the Observability Review's traceability goals and for DECISION-048 explainability requirements.

## PROPOSED-F — Global Auth Guard + Unauthenticated `/auth/register` Role Assignment

**Problem:** `JwtAuthGuard` is not registered as a global `APP_GUARD` — each module wires its own guard, so a future module that forgets to add it is unprotected by default. Separately, `POST /auth/register` is unauthenticated and accepts caller-supplied `roles` (including `ADMIN`) with no authorization check.
**Options:** (a) register `JwtAuthGuard` globally with an explicit `@Public()` opt-out decorator (fail-closed by default); (b) keep per-module wiring but add a lint/CI check that every controller has a guard.
**Recommendation:** (a) for the guard; separately, `/auth/register` role assignment should require an authenticated ADMIN caller or be restricted to `STUDENT` by default outside of seed/dev tooling — this is a live privilege-escalation path, not just a consistency finding, and should be treated with priority independent of this batch's "no code changes" constraint.

## PROPOSED-G — SYSTEM Role Scope for API Keys

**Problem:** Any valid API key is granted the `SYSTEM` role, which has all permissions equal to `ADMIN`, with no per-key scoping. API key issuance/revocation has no HTTP surface and is never audit-logged.
**Options:** (a) add scoped permissions per API key rather than blanket `SYSTEM`=`ADMIN`; (b) accept for internal/service-to-service use only, documented as such.
**Recommendation:** (a) before API keys are exposed to any external integration; audit-log issuance/revocation regardless.

---

## Deprecated / Superseded Concepts (pending Founder confirmation)

- `RLS_ACTOR_MODEL.md`, `RLS_BOUNDARY_MATRIX.md`, `RLS_POLICY_STRATEGY.md`, `RLS_READINESS_ASSESSMENT.md`, `RLS_RESOURCE_CLASSIFICATION.md`, `RLS_RISK_REVIEW.md`, `TABLE_SECURITY_CLASSIFICATION.md`, `SUPABASE_AUTH_ALIGNMENT.md` — written for a Postgres/Supabase RLS model that was never built; actual access control is NestJS application-layer RBAC only. Candidates for a "Superseded — see PROPOSED-C" marker, not deletion.
- Duplicate `Priority` and `Difficulty`/`Complexity` value objects (see `SharedVocabulary.md`) — candidates for consolidation once PROPOSED-A lands.

## Future Shared Libraries (implied by findings, not a commitment)

- A `shared-kernel` package/folder for branded IDs and shared value objects (Priority, Difficulty) referenced by goal/roadmap/assessment/recommendation without duplication.
- A shared `outbox event envelope` type used by all module event publishers, to prevent the correlation/causation-dropping bug from recurring per module.
