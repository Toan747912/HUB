# Decision Traceability Review — DDL Finalization

> **Round:** DDL Finalization Review.  
> **Scope:** Map locked Decisions (DECISION-001..048, persistence-relevant subset) to DDL Round 1–3 representation.  
> **No SQL. Review only.**

---

## 0. Representation Scale

| Status | Meaning |
|---|---|
| **Fully represented** | Decision requirements visible in designed tables/constraints/relationships |
| **Partially represented** | Core structure exists; enforcement, companion structures, or dependent entities incomplete |
| **Not represented** | No DDL artifact; or explicit deferral with no table |

---

## 1. Platform & Physical Design (DECISION-040..045)

| Decision | Topic | Status | DDL evidence / gap |
|---|---|---|---|
| **DECISION-040** | Physical design split (Blueprint → DDL rounds) | **Fully** | 3 DDL rounds follow planned split |
| **DECISION-042** | snake_case naming | **Fully** | All 17 tables comply |
| **DECISION-043** | `learner.id = auth.users.id` | **Fully** | `learner.id` PK, FK to auth.users, ON DELETE RESTRICT |
| **DECISION-044** | `version_number` on high-contention entities | **Partially** | Columns on `learner`, `knowledge_node_mastery`; **triggers not in DDL rounds** |
| **DECISION-045** | History tables only without companion log | **Partially** | Companion logs designed (`approval_record`, `assessment_result`, `learning_session_transition`); **`history.*` tables not designed** |

---

## 2. Domain & Persistence Philosophy (DECISION-032..037)

| Decision | Topic | Status | DDL evidence / gap |
|---|---|---|---|
| **DECISION-032** | Immutable Goal | **Fully** | `goal` append-only; `supersedes_goal_id`; no `updated_at` |
| **DECISION-033** | Adaptive Pause | **Partially** | `learning_session_transition` with `transition_actor_type`; **link to `recommendation_proposal` implicit until Round 4** |
| **DECISION-035** | No full event sourcing | **Fully** | No event store tables (correct omission) |
| **DECISION-036** | LearningProfile is projection | **Fully** | No table (correct) |
| **DECISION-037** | RTBF via anonymization | **Fully** | `learner.anonymized_at`; RESTRICT on auth FK |

---

## 3. Knowledge & Evidence (DECISION-015..025, 029, 039)

| Decision | Topic | Status | DDL evidence / gap |
|---|---|---|---|
| **DECISION-015** | Separate Roadmap/Knowledge graphs | **Fully** | `roadmap_node_knowledge_node` bridge; no mixing in `knowledge_edge` |
| **DECISION-022** | Evidence↔KN via link + stance | **Fully** | `evidence_link.stance` (not global evidence type) |
| **DECISION-023** | Controlled expansion + reason | **Partially** | `expansion_record` for Deep/Structural; **Local Expansion (D5) not represented (GAP-02)** |
| **DECISION-024** | Concept = KnowledgeNode | **Fully** | `knowledge_node` |
| **DECISION-025** | DAG, immutable edges | **Fully** | `knowledge_edge` append-only |
| **DECISION-029** | Runtime reachability, no closure table | **Fully** | No closure/parent_id on `knowledge_edge` |
| **DECISION-039** | Relational graph + Recursive CTE | **Fully** | `knowledge_node` + `knowledge_edge` only |

---

## 4. Assessment & Mastery (DECISION-026, 030, 020)

| Decision | Topic | Status | DDL evidence / gap |
|---|---|---|---|
| **DECISION-026** | Assessment owns Mastery | **Fully** | `knowledge_node_mastery` in Assessment module ownership |
| **DECISION-030** | AssessmentResult 8 fields | **Fully** | All 8 fields; field 7 via `trace_link` |
| **DECISION-020** | Teach composite capability | **Fully** | `teach_score`, `teach_capability_scores` jsonb on mastery + result |
| **DECISION-021** | Evidence weighting | **Partially** | `evidence_link.evidence_weight` column; **formula not locked (Gap 5)** |

---

## 5. Traceability & Explainability (DECISION-027, 038, 048)

| Decision | Topic | Status | DDL evidence / gap |
|---|---|---|---|
| **DECISION-027** | Explainability First (original 3 groups) | **Partially** | D2/D4 implemented; **D3/D5/D6/D7/D9 gaps remain** |
| **DECISION-038** | TraceLink centralized | **Fully** | `trace_link` polymorphic design |
| **DECISION-048** | All AI decisions explainable | **Partially** | D2/D4 strong; **D1/D5/D6/D7/D9a/D9b missing persistence**; D8 Runtime Reconstruction (no table by design) |

---

## 6. Session & Roadmap Governance (DECISION-006, 028, 031, 047)

| Decision | Topic | Status | DDL evidence / gap |
|---|---|---|---|
| **DECISION-006** | Roadmap governance via approval | **Fully** | `approval_record` |
| **DECISION-028** | LearningSession orchestrator | **Fully** | `learning_session` 1:1 with `goal` |
| **DECISION-031** | SubSession vs MentorSession | **Partially** | `sub_session` exists; **`mentor_session` + link not designed** |
| **DECISION-047** | Transition log | **Fully** | `learning_session_transition` |

---

## 7. Recommendation & Discovery (DECISION-019, 007)

| Decision | Topic | Status | DDL evidence / gap |
|---|---|---|---|
| **DECISION-019** | Recommendation proposes only | **Not represented** | `recommendation_proposal` table missing |
| **DECISION-007** | Discovery engine | **Not represented** | `discovery_session`, `self_assessment_mismatch` missing |

---

## 8. Highest-Risk Decision Gaps (ranked)

| Rank | Decision | Risk | Why |
|---|---|---|---|
| 1 | **DECISION-048** (D1, D5) | **Critical** | Teaching + Local Expansion have **zero** persistence — violates expanded explainability scope |
| 2 | **DECISION-019** + **DECISION-027** (D3) | **High** | No `recommendation_proposal`; `trace_link` enum ready but unusable |
| 3 | **DECISION-048** (D7) | **High** | Discovery explainability requires entities not in DDL |
| 4 | **DECISION-031** + **DECISION-048** (D8, D9) | **High** | `mentor_session` missing; Stuck/Mode mechanisms unverified |
| 5 | **DECISION-048** (D6) | **High** | Dependency Edge exists without dedicated reason column (GAP-05) |
| 6 | **DECISION-045** | **Medium** | History tables referenced but not designed — audit gap on mutable entities |
| 7 | **DECISION-033** | **Medium** | Pause-from-recommendation trace incomplete without Recommendation table |
| 8 | **DECISION-023** (Local) | **Critical** | Same as D5/GAP-02 |

---

## 9. Summary Counts (persistence-relevant locked decisions)

| Status | Approx. count |
|---|---|
| **Fully represented** | 22 |
| **Partially represented** | 12 |
| **Not represented** | 4 (+ Decision Header mechanism) |

---

## Liên kết ngược

[DDL_COVERAGE_REVIEW.md](DDL_COVERAGE_REVIEW.md), [EXPLAINABILITY_PERSISTENCE_REVIEW.md](EXPLAINABILITY_PERSISTENCE_REVIEW.md), [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md).
