# DDL Coverage Review — AI Mentor OS

> **Round:** DDL Finalization Review.  
> **Scope:** Cross-check [DatabaseBlueprint.md](DatabaseBlueprint.md), DDL Round 1–3, against [LogicalDatabaseModel.md](LogicalDatabaseModel.md), [CoreDomainMap.md](../03_Domain_Model/CoreDomainMap.md), and locked Decisions.  
> **No SQL. Review only.**

---

## 0. Coverage Baseline

| Source | Entity count | Tables designed (DDL R1–3) |
|---|---|---|
| Logical Database Model (18 domain entities + 1 supporting) | 19 | 18 represented + 1 bridge |
| Database Blueprint (20 entities) | 20 | 17 tables + 3 missing |
| TraceLink (cross-cutting) | 1 | ✅ `trace_link` |
| LearningProfile (DECISION-036) | 0 (projection) | N/A — correct omission |

**Total tables in DDL R1–3:** 17  
**Total entities requiring persistence per Blueprint:** 20 (+ `history.*` companion structures per DECISION-045)

---

## 1. Covered Entities (DDL Round 1–3)

| # | Entity | Table | Round | Aggregate | Module write-owner |
|---|---|---|---|---|---|
| 1 | `Learner` | `learner` | 1 | Root (B1) | Identity |
| 2 | `Goal` | `goal` | 1 | Root (B2) | Goal & Roadmap |
| 3 | `Roadmap` | `roadmap` | 1 | Root (B3) | Goal & Roadmap |
| 4 | `RoadmapNode` | `roadmap_node` | 1 | Child (B3) | Goal & Roadmap |
| 5 | `ApprovalRecord` | `approval_record` | 1 | Child (B3) | Goal & Roadmap |
| 6 | `LearningSession` | `learning_session` | 1 | Root (B11) | Learning Session |
| 7 | `SubSession` | `sub_session` | 1 | Child (B11) | Learning Session |
| 8 | `LearningSessionTransition` | `learning_session_transition` | 1 | Supporting (B11) | Learning Session |
| 9 | `KnowledgeNode` | `knowledge_node` | 2 | Root (B4) | Knowledge Graph |
| 10 | `KnowledgeEdge` | `knowledge_edge` | 2 | Child (B4) | Knowledge Graph |
| 11 | `KnowledgeNodeMastery` | `knowledge_node_mastery` | 2 | Root (B6) | Assessment |
| 12 | `Evidence` | `evidence` | 2 | Root (B5) | Evidence |
| 13 | `EvidenceLink` | `evidence_link` | 2 | Child (B5) | Evidence |
| 14 | `AssessmentResult` | `assessment_result` | 2 | Root (B7) | Assessment |
| 15 | `TraceLink` | `trace_link` | 2 | Cross-cutting | Explainability |
| 16 | `RoadmapNode ↔ KnowledgeNode` (Dependency Edge) | `roadmap_node_knowledge_node` | 3 | Child of Roadmap (B3) | Goal & Roadmap |
| 17 | `ExpansionRecord` | `expansion_record` | 3 | Child (B4) | Knowledge Graph |

**Verdict:** All entities from Rounds 1–3 scope are designed. Round 3 closed the two deferred gaps from Round 1/2 (`roadmap_node_knowledge_node`, `expansion_record`).

---

## 2. Missing Entities (Core — require DDL Round 4)

| # | Entity | Expected table | Aggregate | Why missing | Blueprint ref |
|---|---|---|---|---|---|
| 1 | `DiscoverySession` | `discovery_session` | Root (B8) | Discovery Module deferred to Round 4+ | 1.13 |
| 2 | `SelfAssessmentMismatch` | `self_assessment_mismatch` | Child (B8) | Same | 1.14 |
| 3 | `MentorSession` | `mentor_session` | Root (B9) | Mentor Interaction Module deferred | 1.15 |
| 4 | `RecommendationProposal` | `recommendation_proposal` | Root (B10) | Recommendation Module deferred | 1.16 |

**Impact:** Recommendation (D3), Discovery (D7), Mentor Interaction (D8/D9), and Evidence→MentorSession linkage cannot be fully materialized until Round 4 DDL exists.

---

## 3. Missing Supporting Entities

| Structure | Purpose | Decision / source | Status |
|---|---|---|---|
| **`history.learner`** | Trigger-maintained audit on `learner` UPDATE | DECISION-045 | Not in any DDL round |
| **`history.knowledge_node`** | Content change audit (if content edits confirmed) | DECISION-045, Open Q#4 | Not designed |
| **`history.discovery_session`** | Session mutation audit | DECISION-045 | Blocked on `discovery_session` DDL |
| **`history.mentor_session`** | Mode/lifecycle audit | DECISION-045 | Blocked on `mentor_session` DDL |
| **Decision Header** | Forward registry for AI decisions (D1/D6/D7/D9/D8 registry) | DECISION-048, SHARED_DECISION_PERSISTENCE_REVIEW | Mechanism pending — no table |
| **Teaching Decision Log** (candidate) | D1 Content Selection reasoning | GAP-01, DECISION-048 | No entity approved |
| **Local Expansion Log** (candidate) | D5 internal reasoning | GAP-02, DECISION-027 | No entity approved |
| **`recommendation_proposal` confirmation fact** | Confirmed/Ignored terminal state (append fact) | Blueprint 1.16 lifecycle | May be column on `recommendation_proposal` or companion row — not designed |
| **SubSession ↔ MentorSession join** | DECISION-031 hierarchy | Logical Model mục 2 | No join table / FK array designed |

---

## 4. Missing Relationships (designed tables with incomplete FK graph)

| Relationship | Expected | Current state | Blocker |
|---|---|---|---|
| `sub_session.knowledge_node_id` → `knowledge_node` | FK NOT NULL (scope check) | Column exists, **no FK** (Round 1 forward dep) | Can close now — `knowledge_node` exists |
| `evidence.mentor_session_id` → `mentor_session` | FK (optional or required — Open Q#2) | Placeholder column, **no FK** | Needs `mentor_session` table + Open Q#2 |
| `SubSession` ↔ `MentorSession` | * — 1 per DECISION-031 | Not designed | Needs `mentor_session` + join strategy |
| `ExpansionRecord` ↔ `KnowledgeEdge` | 1-* or *-* (unconfirmed) | **No FK** | Domain Architecture gap |
| `AssessmentResult`/`RecommendationProposal` → sources | Via `trace_link` | Table exists; **no physical FK** | By design (DECISION-038) |
| `RecommendationProposal` → `trace_link` | `source_type = recommendation_proposal` | Enum provisioned | Target table missing |
| `trace_link.target_type = discovery_session` | FK path | Enum provisioned | `discovery_session` missing |

---

## 5. Missing Persistence Structures (non-table)

| Mechanism | Required by | Designed in DDL? |
|---|---|---|
| `version_number` trigger on `knowledge_node_mastery` | DECISION-044 | Column yes; trigger spec in docs only |
| `version_number` trigger on `learner` | DECISION-044 (optional) | Column yes; trigger not in DDL rounds |
| Generic `history.*` trigger function | DECISION-045 | Referenced; not specified in DDL rounds |
| Partial unique index pattern | `roadmap_node_knowledge_node` | ✅ Designed |
| RLS policies | Supabase architecture | Prepared ([POLICY_AUTHORING_PREPARATION.md](POLICY_AUTHORING_PREPARATION.md)); no SQL |
| Event bus / outbox tables | DECISION-035 (not full event sourcing) | **Explicitly absent** — events are runtime, not persisted as event store |

---

## 6. Aggregate Coverage Matrix

| Boundary | Aggregate root | Children / supporting | DDL complete? |
|---|---|---|---|
| B1 | `learner` | — | ✅ |
| B2 | `goal` | — | ✅ |
| B3 | `roadmap` | `roadmap_node`, `approval_record`, `roadmap_node_knowledge_node` | ✅ |
| B4 | `knowledge_node` | `knowledge_edge`, `expansion_record` | ✅ |
| B5 | `evidence` | `evidence_link` | ✅ (FK to mentor pending) |
| B6 | `knowledge_node_mastery` | — | ✅ |
| B7 | `assessment_result` | — | ✅ |
| B8 | `discovery_session` | `self_assessment_mismatch` | ❌ Round 4 |
| B9 | `mentor_session` | — | ❌ Round 4 |
| B10 | `recommendation_proposal` | — | ❌ Round 4 |
| B11 | `learning_session` | `sub_session`, `learning_session_transition` | ✅ (sub_session FK gap) |
| — | `trace_link` | — | ✅ |

**Aggregates fully represented:** 8 / 11 (+ cross-cutting TraceLink)

---

## 7. Module Coverage vs Database Blueprint §3

| Module | Blueprint entities | DDL status |
|---|---|---|
| Identity | `learner` | ✅ |
| Goal & Roadmap | 4 + bridge | ✅ |
| Knowledge | 3 | ✅ |
| Evidence | 2 | ✅ (partial FK) |
| Assessment | 2 | ✅ |
| Discovery | 2 | ❌ |
| Mentor Interaction | 1 | ❌ |
| Recommendation | 1 | ❌ |
| Learning Session | 3 | ✅ |
| Traceability | `trace_link` | ✅ |

---

## 8. Coverage Summary

| Category | Count |
|---|---|
| **Covered** | 17 tables / 18 entity roles (including bridge) |
| **Missing core entities** | 4 |
| **Missing supporting** | 6+ (history, Header, D1/D5 logs, join tables) |
| **Incomplete relationships** | 7 (3 closable without new entities; 4 blocked) |

---

## Liên kết ngược

[DECISION_TRACEABILITY_REVIEW.md](DECISION_TRACEABILITY_REVIEW.md), [EXPLAINABILITY_PERSISTENCE_REVIEW.md](EXPLAINABILITY_PERSISTENCE_REVIEW.md), [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md), [DDL_FINALIZATION_READINESS.md](DDL_FINALIZATION_READINESS.md).
