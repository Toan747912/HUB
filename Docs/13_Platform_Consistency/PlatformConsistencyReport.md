# Platform Consistency Report — WP-06B

**Batch:** WP-06B — Platform Consistency Review
**Type:** Governance / architecture review only. No code generation, no schema rewrite, no new modules, no decisions unlocked.
**Modules reviewed:** Goal, Roadmap, Assessment, Recommendation (implemented, DDD, `Apps/ai-backend/src/modules/*`); Discovery, Evidence, Knowledge, Learning Session, Teaching (documented, stub-only in code); Security, Observability, Shared Infrastructure.
**Incoming classification:** `READY_FOR_LEARNING_SESSION_ENGINE (Conditional)`

---

## 1. Executive Summary

The four implemented core modules (Goal, Roadmap, Assessment, Recommendation) are internally well-structured DDD aggregates with consistent internal patterns (application/domain/infrastructure/interface layering, outbox-based event publication, optimistic concurrency via `aggregateVersion`). Within each module, code is clean and each module's own readiness review is accurate.

The problems are **cross-module and cross-layer**, not within any one module:

1. Every cross-module reference (`goalId`, `roadmapId`, `assessmentId`, `learnerId`) is an untyped string with no format contract or existence validation — a documented "Soft FK" strategy that was never implemented.
2. `skillArea`, the concept every downstream module (Assessment, Recommendation) depends on, has no canonical owner — it is free text passed hand to hand. All three downstream readiness reviews flag this independently as their top risk.
3. Two "canonical" persistence tracks exist simultaneously and disagree: `Docs/06_Database/*` documents a Postgres/Supabase schema (DECISION-042 through 045, RLS docs); the actual system is MongoDB/Mongoose. Neither has been marked as superseding the other.
4. There is **no live orchestration**. `goal/orchestration/` is empty, no event subscription exists anywhere in the codebase (`EventEmitter2`/`@OnEvent`/`EventBus` — zero matches). Outbox events are persisted and published, but nothing in-process consumes them. A Goal change today propagates to nothing downstream automatically — despite Roadmap → Assessment → Recommendation being presented as a chain.
5. Documented event names diverge from implemented event names, and the two event-catalog docs disagree with each other. More than half of documented domain events (everything owned by Discovery, Evidence, Knowledge, Learning Session, Teaching) are unimplemented.
6. Correlation/causation IDs exist on in-memory domain events but are dropped before persistence to the outbox and fabricated on relay — breaking traceability exactly on the durable-retry path.
7. Security is solid in mechanism (JWT rotation with reuse detection, bcrypt + brute-force lock, hashed API keys, consistent RBAC naming) but has two live gaps: `JwtAuthGuard` is not global, and `/auth/register` is an unauthenticated endpoint that accepts caller-supplied `roles`.
8. Observability is fully wired for the four implemented modules and completely absent (zero instrumentation) for the five stub modules — an asymmetry that will surface as blind spots the moment those modules gain real logic.
9. No uniqueness constraints exist anywhere in the four Mongo schemas — "one active goal per learner" and similar invariants are, at best, enforced only in application code not covered by this review.

None of these are urgent production bugs in the four implemented modules today. All of them compound if a Learning Session Engine is built now, because DECISION-028 defines Learning Session as an **orchestrator over Goal/Roadmap/Knowledge/Evidence/Assessment/Recommendation** — i.e., it will be the first consumer that needs every one of the above to already be resolved.

---

## 2. Canonical Entity Review

See **`CanonicalEntityCatalog.md`** for the full table. Headline findings:
- `Priority` and `Difficulty`/`Complexity` are each defined twice, independently, with no shared value object.
- `Skill` / `Competency` / `KnowledgeNode` are three names for overlapping concepts, never reconciled — `KnowledgeDomain.md` calls `KnowledgeNode` a "skill area" in prose, but `CompetencyLevelValue` is a separate typed scale that never references `KnowledgeNode`.
- `Learning Resource` is named in exactly one report file and has no domain model anywhere.
- `KnowledgeNodeId` is fabricated (stubbed) in code rather than sourced from a real entity.

## 3. Cross-Module Identity Review

See **`CrossModuleReferenceMatrix.md`**. All cross-module references are untyped strings. No branded ID types exist in the codebase. `RecommendationAggregate`'s constructor takes four consecutive string ID parameters — a same-type, wrong-order bug would type-check silently. The documented "Soft FK" identifier-format/validation contract (`Cross_Domain_FK_Strategy.md`) is not implemented.

## 4. Event Consistency

- **Naming:** consistent *within* code (PascalCase past-tense) but diverges from docs (`GoalDefined` in docs vs. `GoalCreated` in code; `RecommendationProposed` in docs vs. `RecommendationGenerated` in code), and the two event docs (`EVENT_CATALOG.md`, `Event_Ownership_Matrix.md`) disagree with each other in places.
- **Payload:** mostly minimal/ID-oriented as intended, with a couple of modules embedding small structured arrays (mild fattening, not a violation).
- **Versioning:** no dedicated event-schema/contract version field exists; only `aggregateVersion` (an entity concurrency counter) is present.
- **Metadata:** rich in-memory (`traceId`, `correlationId`, `causationId`) but **dropped on persistence** to the outbox schema, then fabricated on relay (`correlationId = doc.eventId`) — breaking the causal chain for anything that goes through durable retry.
- **Ordering:** the outbox has a `{status, occurredAt}` index but `findPending` does not `.sort()` by it — ordering is not actually enforced despite the index implying it should be. No per-aggregate ordering guarantee found in the relay/queue path.
- **Ownership:** respected for the four implemented modules; **not implemented at all** for Discovery, Evidence, Knowledge, Learning Session, Teaching — over half the documented event catalog does not exist in code.

## 5. Aggregate Boundary Review

No direct cross-aggregate writes, no circular module imports — the implemented modules are cleanly isolated at the code level (see `CrossModuleReferenceMatrix.md`). However, `DomainBoundaryGuardService` — the one dedicated boundary-enforcement mechanism — only validates caller-supplied request metadata (`route`, `attempted_writes`) on a single endpoint (`ai-runtime.service.ts`); it does not inspect real repository writes. It should not be relied upon as the structural guarantee the docs imply exists.

## 6. RBAC Review

- Permission naming is consistent (`Noun.Verb`), role coverage is complete (no orphan roles/permissions), every implemented-module controller endpoint has both an auth guard and `@RequirePermissions`.
- Two structural gaps: `JwtAuthGuard` is not registered globally (each module opts in individually); `SYSTEM` role (auto-granted to any valid API key) has full `ADMIN`-equivalent permissions with no per-key scoping.
- One live security gap surfaced incidentally: `POST /auth/register` is unauthenticated and accepts caller-supplied `roles`, including `ADMIN`.

## 7. Observability Review

- Metrics, tracing, structured logging, and audit-log integration are fully present for Goal/Roadmap/Assessment/Recommendation, and **entirely absent** for Discovery/Evidence/Knowledge/Learning-Session/Teaching (still 2-file stub services).
- Metric naming has no consistent prefix and mixed unit-suffix conventions (`roadmap_generation_duration` lacks the `_seconds` suffix `http_request_duration_seconds` uses).
- Two independent `structured-logger.service.ts` implementations exist (shared infra vs. migration module) with different field sets.
- Alerting covers Redis/Mongo/BullMQ/Outbox-backlog/circuit-breaker/latency/error-rate, but has no alert on outbox *relay failure rate* (only backlog size) and no alert on authentication failure rate.
- Goal module's outbox publisher was not found among callers of `AuditLogService.recordFromDomainEvent` (Recommendation/Assessment/Roadmap are) — a possible audit-coverage gap worth confirming.
- `ExplainabilityRulesService` (DECISION-048) is only consumed by `ai-runtime.service.ts`; no evidence it is applied to Discovery/Knowledge/Teaching decision paths, which DECISION-048 explicitly requires to be explainable (D7, D9a).

## 8. Security Review

JWT (HS256, 15m access / 7d refresh), refresh-token rotation with reuse-detection and family revocation, bcrypt + Redis-backed brute-force lock (silently disabled if Redis is absent — worth a warning/fallback), and hashed API keys are all sound mechanisms. See `ArchitectureDecisionRecords.md` PROPOSED-F/G for the two items that need attention (global guard, `/auth/register`, SYSTEM-role scoping).

`RLS_*.md` and `TABLE_SECURITY_CLASSIFICATION.md` describe a Postgres/Supabase RLS model that does not exist in the actual MongoDB implementation — these documents are stale relative to the shipped system (see §9).

## 9. Planning Consistency (Goal → Roadmap → Assessment → Recommendation)

- No non-determinism found in the roadmap-planning or recommendation engines (no `Math.random`/uncontrolled `Date.now()`; time inputs are explicit parameters) — this dimension is genuinely clean.
- The chain is **not wired**. `goal/orchestration/` is empty; there is no event subscriber anywhere in the codebase. Each downstream module stores an upstream snapshot captured at creation time rather than reacting to change. A Goal update today does not propagate anywhere automatically — matching what each module's own readiness review already states, but worth stating together: this is a platform-level gap, not four separate module gaps.
- Stated readiness per module: Goal `READY_FOR_IMPLEMENTATION`; Roadmap `READY_FOR_ASSESSMENT_MODULE — Conditional`; Assessment `READY_FOR_RECOMMENDATION_ENGINE — Conditional`; Recommendation `READY_FOR_LEARNING_SESSION_ENGINE — Conditional`. All three "Conditional" flags trace back to the same unresolved `skillArea` question.

## 10. Data Consistency (MongoDB)

- All four schemas consistently use `aggregateVersion` (optimistic concurrency) and Mongoose `timestamps: true` — good internal consistency.
- **No schema has a soft-delete field**, despite `CanonicalAuditAndSoftDeleteStandards.md` mandating one — but note that doc is written for the Postgres track (see below).
- **No unique indexes exist anywhere** in the four schemas — only compound non-unique `{learnerId, status}` indexes. "One active goal per learner" and similar invariants documented in `CanonicalIndexStrategy.md` are not enforced at the database layer.
- The naming mismatch (`aggregateVersion` vs. the Postgres-track's documented `version_number`) is a symptom of §9's larger issue: two canonical schema tracks exist, Postgres (`Docs/06_Database/*`, DECISION-042–045) and MongoDB (actual code), and they were never reconciled. This is the single largest doc/reality gap in the platform and is the reason several "Canonical" documents (schema, RLS, versioning, soft-delete standards) currently describe a system that isn't the one running.

---

## 11. Output

### Approved standards (confirmed consistent, keep as-is)
- RBAC permission naming (`Noun.Verb`) and role→permission coverage.
- JWT/refresh-token rotation mechanism and reuse-detection design.
- DDD layering (domain/application/infrastructure/interface) used consistently across Goal/Roadmap/Assessment/Recommendation.
- Event naming convention *within* code (PascalCase past-tense) — needs doc alignment, not a code change.
- Deterministic engine design (no hidden randomness/clock reads) in roadmap-planning and recommendation engines.

### Required migrations (implementation work, out of scope for this batch — route through normal WP process)
1. Branded ID value objects for Goal/Roadmap/Assessment/Recommendation/Learner (`ArchitectureDecisionRecords.md` PROPOSED-A).
2. Canonical skill/competency entity replacing free-text `skillArea` (PROPOSED-B).
3. Persist `traceId`/`correlationId`/`causationId` on the outbox schema (PROPOSED-E).
4. Register `JwtAuthGuard` globally; restrict `/auth/register` role assignment (PROPOSED-F).
5. Scope `SYSTEM`/API-key permissions; audit-log API key issuance/revocation (PROPOSED-G).
6. Add unique indexes for documented invariants (e.g., one active goal per learner).
7. Reconcile `EVENT_CATALOG.md`/`Event_Ownership_Matrix.md` against actual event names, or vice versa (PROPOSED-D).

### Deprecated concepts (pending Founder confirmation — see `ArchitectureDecisionRecords.md`)
- `RLS_*.md`, `TABLE_SECURITY_CLASSIFICATION.md`, `SUPABASE_AUTH_ALIGNMENT.md` — Postgres/Supabase-specific, not applicable to the shipped Mongo implementation.
- Duplicate `Priority`/`Difficulty` value objects — consolidate once shared-kernel exists.

### Future shared libraries
- `shared-kernel` package for branded IDs and shared value objects.
- Shared outbox event envelope type (prevents per-module correlation/causation loss recurring).

---

## 12. Classification

**Recommended classification: `NEEDS_STANDARDIZATION`** (revised down from the incoming `READY_FOR_LEARNING_SESSION_ENGINE (Conditional)`).

Rationale: DECISION-028 defines Learning Session as an orchestrator *over* Goal, Roadmap, Knowledge, Evidence, Assessment, and Recommendation. Building it now would make it the first component to depend simultaneously on: untyped cross-module IDs, an unresolved `skillArea` concept, a live orchestration gap (nothing currently subscribes to any domain event), and five modules (Discovery, Evidence, Knowledge, Learning Session itself, Teaching) that have no events, no persistence beyond a stub, and no observability. Each of these was independently flagged as "Conditional" by the module that would feed the engine; this review's contribution is showing they are the *same* underlying gap (canonical vocabulary + missing orchestration), not four unrelated ones.

**Path back to `READY_FOR_LEARNING_SESSION_ENGINE`:** resolve PROPOSED-A (IDs) and PROPOSED-B (`skillArea`/competency) at minimum — these are the two items every downstream readiness review names explicitly. PROPOSED-C (persistence track reconciliation) should be resolved before further schema-adjacent work of any kind, independent of the Learning Session Engine decision, since it currently makes the entire `Docs/06_Database/Canonical*` doc set unreliable as a reference.

This is a review recommendation, not a decision — the Founder makes the final call per `Docs/GOVERNANCE.md` §1.
