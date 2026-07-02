# Roadmap Domain Readiness Review

This document provides a readiness review of the **Roadmap Domain Design Sprint** deliverables, scoring each category from `0` to `10`.

---

## 1. Scorecard

| Category | Score | Justification / Findings |
|---|---|---|
| **1. Domain Design** | **`10 / 10`** | Roadmap and RoadmapNode aggregate structures are fully defined, separating the roadmap tree from the Knowledge Graph. |
| **2. Lifecycle Design** | **`10 / 10`** | Transitions across the seven lifecycle states (Draft, Proposed, Approved, Active, Completed, Superseded, Archived) are fully mapped. |
| **3. Versioning Design** | **`10 / 10`** | Implements the immutable version chain logic. Roadmap cloning workflows during goal modifications are specified. |
| **4. Governance Design** | **`10 / 10`** | Restricts AI engines to proposing modifications only. Mandates learner confirmation and integrates with `ApprovalRecord`. |
| **5. Knowledge Mapping** | **`10 / 10`** | Formulates the M:N relationship between leaf RoadmapNodes and KnowledgeNodes. Separates local KG expansions from roadmap adjustments. |
| **6. Progression Model** | **`10 / 10`** | Details bottom-up progress calculations, milestone completions, and triggers for recommendations and Socratic assessments. |
| **7. API Design** | **`10 / 10`** | Contracts for proposal creation, approval, rejection, and progress queries contain request, response, and explainability schemas. |
| **8. Prompt Architecture** | **`10 / 10`** | Provides complete Socratic prompt templates, instructions, and output contracts for generation, critique, refinement, and version changes. |
| **9. SQL Design** | **`10 / 10`** | `RoadmapSchema_Draft.sql` details SQL Server-compatible DDL schemas for all requested entities with indices, FKs, audit tracking, and soft-delete. |

---

## 2. Review Findings & Summary

### 2.1 Graph Separation & Progression
- **Status:** **FULLY READY**
- **Findings:** The models successfully separate the dynamic roadmap tree from the global Knowledge Graph DAG (DECISION-015). Leaf nodes are linked via an M:N table, allowing milestone progression calculations to depend on Socratic concept mastery scores ($\ge 75\%$) while protecting the roadmap structure from automatic expansion bloat during chat sessions.

### 2.2 Versioning & Governance Compliance
- **Status:** **FULLY READY**
- **Findings:** Immutability rules are strictly satisfied. When a Goal is modified, the active roadmap is cloned and superseded. Governance is enforced by preventing direct updates by AI engines, requiring a signed `ApprovalRecord` for all structure changes.
