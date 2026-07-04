# Platform Standardization Certification Checklist

**Batch:** WP-06C — Platform Standardization & Hardening  
**Status:** Certified (All Criteria Passed)  

---

## 1. Compliance Checklist

This checklist verifies that the platform standardization requirements have been fully implemented and validated in the codebase:

### Workstream A: Canonical Typed Identifiers
- [x] Create [Identifier base class](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/shared/domain/identifiers/identifier.base.ts) with phantom type brand mechanism.
- [x] Create concrete branded identifier subclasses for: `GoalId`, `RoadmapId`, `AssessmentId`, `RecommendationId`, `LearnerId`, `SkillId`, `TaskId`, `MilestoneId`, `PhaseId`.
- [x] Verify that ID transposition yields TypeScript compile-time errors.
- [x] Map identifiers at the boundaries: interface input parser (raw string → typed ID) and persistence mapper (typed ID → document string).

### Workstream B: Canonical Skill Catalog
- [x] Create centralized [Skill aggregate](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/modules/skill/domain/aggregates/skill.aggregate.ts) and schema.
- [x] Define unique index on `normalizedName` to prevent race-condition duplicates.
- [x] Refactor Assessment and Recommendation entities to use strongly typed `SkillId` references instead of free-text `skillArea` strings.
- [x] Run the one-time migration script [migrate-skill-areas.script.ts](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/modules/skill/scripts/migrate-skill-areas.script.ts) to populate the catalog from test fixtures.

### Workstream C: Canonical Vocabulary
- [x] Consolidate `Priority` and `Confidence` under [src/shared/domain/vocabulary/](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/shared/domain/vocabulary/).
- [x] Move `CompetencyLevel` and `LearningStrategy` to the shared vocabulary folder to allow platform-wide reuse.
- [x] Confirm that distinct concepts (e.g., `GoalDifficulty` vs `RoadmapComplexity`, and `GoalProgress` vs `RoadmapProgress`) remain separate.

### Workstream D: Persistence Canonicalization
- [x] Accept MongoDB as the unified production database platform ([DECISION-058](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md)).
- [x] Mark all obsolete Postgres/Supabase schema design records in `Docs/06_Database/` as **Superseded**.
- [x] Document the authoritative collections and fields in [MongoPersistenceModel.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/06_Database/MongoPersistenceModel.md).

### Workstream E: Event Contract Standardization
- [x] Add metadata columns (`traceId`, `correlationId`, `causationId`, `aggregateType`) to [OutboxEventSchema](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/infrastructure/outbox/outbox-event.schema.ts).
- [x] Refactor [OutboxRelayService](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/infrastructure/outbox/outbox-relay.service.ts) to reconstruct the correct typed identifier on relay.
- [x] Verify that trace metadata is preserved during outbox relay sweeps, preventing trace ID fabrication.

### Workstream F: Platform Orchestration
- [x] Register [OrchestrationWorkerService](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/modules/orchestration/application/orchestration-worker.service.ts) as an in-process handler on the shared queue.
- [x] Confirm that invalidation events cascade correctly (Goal → Roadmap → Assessment → Recommendation) without direct aggregate mutations.
- [x] Verify that the orchestration worker processes events sequentially and handles failure cases gracefully.

### Workstream G: Security Hardening
- [x] Register `JwtAuthGuard` globally in `app.module.ts` as an `APP_GUARD`.
- [x] Refactor `/auth/register` endpoint to enforce registration policies (`isSelfAssignedRolesAllowed`).
- [x] Audit registration requests: verify that role elevation attempts are blocked, logged to `AuditLogService`, and rewritten to `STUDENT` default.

---

## 2. Open Items (Deferred to Future Batches)

While the platform is fully standardized and hardened for the current scope, the following structural enhancements remain open for future work packages:

1. **Database-Level Unique Invariants:** No unique indexes exist on MongoDB collections for multi-field invariants (e.g. "one active goal per learner" or "one active roadmap per goal"). These are currently enforced only in application code.
2. **Soft-Delete Standards:** A unified soft-delete flag (`deletedAt` or `isDeleted`) is not yet implemented on domain collections, as adding delete semantics would require introducing new lifecycle and aggregate behaviors.
3. **API Key Permission Scoping:** The `SYSTEM` role assigned to valid API keys is currently granted full `ADMIN`-equivalent privileges. Scoping these key-by-key is deferred until external API integrations are introduced.
4. **Audit Logging of API Keys:** Logging of API key generation, rotation, or revocation remains unimplemented due to the absence of HTTP endpoints for API key administration.
