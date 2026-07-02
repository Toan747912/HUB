# DECISION-055 — Discovery Schema Reconciliation

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-06-30
- **Context:** Resolving architectural discrepancies between the early SQL database drafts and normalized business entity relationships defined in the Discovery Persistence Strategy.

---

## Context

In early database draft documents, the `competency_signal` table maintained a direct nullable foreign key to `knowledge_node_id`. However, during onboarding, the Knowledge Graph is not yet constructed or mapped, leaving competency signals floating without a parent context. The persistence strategy introduces `ClaimedSkillArea` as a key intermediate entity, necessitating a schema update to avoid nullable primary context keys.

---

## Decision

We reconcile the database schema structures for the Discovery domain as follows:

1. **Competency Signal Normalization:** The `competency_signal` table will reference `claimed_skill_area_id` as a **NOT NULL** foreign key, replacing the nullable direct foreign key to `knowledge_node_id`.
2. **Entity Additions:** Introduce three new tables to the DDL layout:
   - `claimed_skill_area`: Represents the raw skill areas clarified during initial session onboarding.
   - `claimed_skill_area_source_answer`: A M:N junction table tracing the specific answers that defined a skill area.
   - `claimed_skill_area_knowledge_node`: An M:N junction table mapping skill areas to Knowledge Graph nodes once mappings are built.
3. **Mismatch Nullability:** Modify the `self_assessment_mismatch` table definition to allow `knowledge_node_id` to be **nullable** (allowing mismatch detection to log claims and observations prior to eventual mapping backfills).

---

## Consequences

- **Normalized Onboarding:** The Discovery Engine can capture answers, extract skill areas, and run probe sequences even if the target Knowledge Graph has not been created or mapped yet.
- **Backfill Strategy:** Mappings between `claimed_skill_area` and `knowledge_node` are resolved asynchronously via the `claimed_skill_area_knowledge_node` table, isolating domain boundaries and ensuring gradual mapping consistency.
- **Traceability:** Aligns database layout cleanly with the audit requirements of DECISION-027 and DECISION-048.

---

## Related Documents
- [DiscoveryPersistenceStrategy.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/06_Database/DiscoveryPersistenceStrategy.md)
- [DiscoverySchema_Draft.sql](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/06_Database/DiscoverySchema_Draft.sql)
- [DECISION-022-Evidence-KnowledgeNode-M2M.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-022-Evidence-KnowledgeNode-M2M.md)
- [DECISION-048-All-AI-Decisions-Must-Be-Explainable.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md)
