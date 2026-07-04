# Architecture Decision Records v2

**Batch:** WP-06C — Platform Standardization & Hardening  
**Status:** Unified Reference Model  

---

## 1. Overview

During the WP-06B Platform Consistency Review, several inconsistencies and historical documentation gaps were identified. Specifically, the codebase relied entirely on MongoDB, whereas historical documentation defined a PostgreSQL/Supabase track. Additionally, cross-module references were weakly typed strings, and there was no live orchestration between core modules.

To address these gaps, **WP-06C** formalizes four new core Architecture Decision Records (ADRs) under [Docs/11_Decisions/](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/), moving proposed designs into fully accepted and locked architecture standards.

---

## 2. Newly Accepted Decisions (WP-06C Consolidation)

The following four ADRs have been officially added to the platform decisions log:

### [DECISION-056 — Canonical Typed Identifiers](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-056-Canonical-Typed-Identifiers.md)
- **Problem:** Cross-module identifier values (`goalId`, `roadmapId`, etc.) were plain `string` types in the domain layer, presenting a silent parameter transposition risk.
- **Decision:** Introduce a base `Identifier<Brand>` class. Enforce strongly typed identifier subclasses (`GoalId`, `RoadmapId`, etc.) throughout the domain layer. Limit string conversion to request parsing (interface boundary) and repository mapping (persistence boundary).
- **Consequences:** Transposition bugs are prevented at compile time. No database schema changes are required.

### [DECISION-057 — Canonical Skill Catalog](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-057-Canonical-Skill-Catalog.md)
- **Problem:** `skillArea` was a free-text string passed between modules, preventing lookup, normalization, and deduplication of skills platform-wide.
- **Decision:** Create a minimal, central `Skill` aggregate and schema under `src/modules/skill/`. Retype `skillArea` fields to strongly typed `SkillId` at domain boundaries. Dedup entries by name normalization inside `SkillCatalogService.findOrCreateByName()`.
- **Consequences:** Free-text fields are replaced by standardized IDs, removing spelling collisions. The catalog remains read-only to external clients, accessed via internal services.

### [DECISION-058 — MongoDB as Canonical Persistence Store](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-058-MongoDB-Canonical-Persistence-Store.md)
- **Problem:** Two parallel database tracks existed simultaneously: the documented PostgreSQL/Supabase track and the actual MongoDB implementation.
- **Decision:** Officially accept MongoDB as the platform's canonical database model. Mark all database schemas and documents under `Docs/06_Database/` that assume PostgreSQL/Supabase as **Superseded**.
- **Consequences:** Eliminates documentation mismatches. Future schema work will align directly with MongoDB schemas under `Apps/ai-backend/src/`. Access control shifts from database RLS to NestJS application-layer RBAC.

### [DECISION-059 — Platform Orchestration Layer](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-059-Platform-Orchestration-Layer.md)
- **Problem:** Core modules were completely disconnected. An update to a Goal did not notify related Roadmaps, Assessments, or Recommendations.
- **Decision:** Introduce a lightweight, strictly event-driven orchestration service (`OrchestrationWorkerService`). It consumes outbox events from `QueueService` and maps them to target modules' application-layer query and command services (rather than directly modifying external repository tables).
- **Consequences:** Enables automatic invalidation propagation (Goal → Roadmap → Assessment → Recommendation) using a simple `invalidatedAt` staleness timestamp, preserving decoupling rules.

---

## 3. Superseded / Deprecated Records

As part of this consolidation, the following historical decisions have been marked as **Superseded** due to the adoption of the MongoDB canonical track:

| Historical Decision | Title | Status | Reason for Superseding |
|---|---|---|---|
| **DECISION-042** | Database Naming Convention Alignment | ⛔ **Superseded by DECISION-058** | PostgreSQL-specific `snake_case` naming is replaced by MongoDB `camelCase` field defaults. |
| **DECISION-043** | Supabase Auth Alignment | ⛔ **Superseded by DECISION-058** | Access control and user identity are managed via NestJS application logic, not Supabase auth schema links. |
| **DECISION-044** | Versioning Strategy | ⛔ **Superseded by DECISION-058** | Optimistic concurrency uses `aggregateVersion: number` instead of database-level `version_number` columns. |
| **DECISION-045** | Temporal Strategy | ⛔ **Superseded by DECISION-058** | Database-level history tracking triggers are replaced by application-level auditing (`AuditLogService`). |

---

## 4. Current Decisions Log Index

For the full index of all 59 decisions, please refer to the main registry: [Docs/11_Decisions/README.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/README.md).
All proposed slots from WP-06B are resolved and locked.
