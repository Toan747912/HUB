# DDL Gap Consolidation — AI Mentor OS

> **Round:** DDL Finalization Review.  
> **Scope:** All gaps, risks, open questions, missing mechanisms from DDL R1–3 + cross-architecture review.  
> **No SQL. Review only.**

---

## 0. Severity Definitions

| Level | Meaning for SQL generation |
|---|---|
| **Critical** | Blocks **full schema** or **violates locked Decision** if ignored; may not block partial R1–3 SQL |
| **High** | Must resolve before production or before affected capability ships |
| **Medium** | Should resolve; workaround exists |
| **Low** | Track; does not block generation |

---

## 1. Critical

| ID | Gap / risk | Source | Blocks SQL gen? |
|---|---|---|---|
| C-01 | **4 core entities missing** — `mentor_session`, `discovery_session`, `self_assessment_mismatch`, `recommendation_proposal` | Coverage review | **Blocks complete schema**; not R1–3 batch |
| C-02 | **GAP-01** — D1 Teaching has 0% persistence | EXPLAINABILITY_GAP_ANALYSIS | No for R1–3; **Yes for Teaching capability** |
| C-03 | **GAP-02** — D5 Local Expansion no internal reason store | DECISION-027/048 vs DDL | No for R1–3; **Yes for Local Expansion** |
| C-04 | **Decision Header mechanism unchosen** | SHARED_DECISION_PERSISTENCE_REVIEW | No for R1–3; **Yes for DECISION-048 closure** |

---

## 2. High

| ID | Gap / risk | Source | Blocks SQL gen? |
|---|---|---|---|
| H-01 | **GAP-05** — `roadmap_node_knowledge_node` lacks reason column (D6) | ROUND3_ARCHITECTURE_REVIEW | Optional before R3 SQL; recommended |
| H-02 | **GAP-04** — `assessment_result` requires `trace_link` but no DB CHECK | ROUND2/3 reviews | No |
| H-03 | **GAP-07** — scattered Application-layer integrity enforcement | EXPLAINABILITY_GAP_ANALYSIS | No |
| H-04 | **`evidence.mentor_session_id`** — FK blocked on missing table + Open Q#2 | DDL R1/R2 | No for evidence table creation |
| H-05 | **SubSession ↔ MentorSession** link unddesigned (DECISION-031) | Logical Model | Blocks Round 4 SQL completeness |
| H-06 | **D9a/D9b** — Stuck/Intervention mechanism open (Open Q#6/#11) | EVENT_CATALOG, AI_DECISION_MATRIX | Blocks D9 DDL |
| H-07 | **D8 Runtime Reconstruction** — inputs not verified | DECISION-048 | Blocks Mentor SQL validation |
| H-08 | **`history.*` tables** not designed (DECISION-045) | Blueprint 1.1, 1.6, 1.13, 1.15 | No for core tables; yes for full temporal strategy |
| H-09 | **ExpansionRecord ↔ KnowledgeEdge** cardinality open | DDL R3 Risk #1 | No |

---

## 3. Medium

| ID | Gap / risk | Source |
|---|---|---|
| M-01 | **GAP-06** — Recommendation lacks Discovery signal until Round 4 | EVENT_CATALOG |
| M-02 | **`sub_session.knowledge_node_id`** FK not added (can close now) | DDL R1 forward dep |
| M-03 | **1 active Goal / Learner** invariant not DB-enforced | DDL R1 Risk #2 |
| M-04 | **`goal.statement` / `roadmap_node.title` / taxonomy** — text-only, Open Q content | DDL R1 Risk #1 |
| M-05 | **`knowledge_node` content versioning** — Open Q#4, history table conditional | DECISION-045 |
| M-06 | **`expansion_class` values** — Claude inference, may merge | DDL R3 Risk #2 |
| M-07 | **Goal/Roadmap/LearningSession archive sync** — 3-boundary saga | Logical Model Risk #2 |
| M-08 | **Several UNIQUE constraints** marked "proposed not locked" | DDL R1/2 |
| M-09 | **`teach_capability_scores` / weights** — Gap 5, jsonb inference | DDL R2 |
| M-10 | **Denormalize `learner_id` on Roadmap branch** for RLS performance | Policy prep |
| M-11 | **Admin cross-Learner authorization** undefined | RLS Architecture |
| M-12 | **Recommendation confirmed/ignored** — append fact shape undecided | Blueprint 1.16 |

---

## 4. Low

| ID | Gap / risk | Source |
|---|---|---|
| L-01 | Partial unique index first use — Supabase compat assumed | DDL R3 Risk #5 |
| L-02 | `knowledge_edge` growth rate operational risk | DECISION-029 |
| L-03 | Auth session vs learning_session naming confusion | SUPABASE_AUTH_ALIGNMENT |
| L-04 | `relation_type` / `domain_category` CHECK lists incomplete | DDL R2 |
| L-05 | No dedup rule for semantic duplicate `knowledge_node` | Blueprint 1.6 |
| L-06 | Cloud AI credential isolation at deploy | RLS_READINESS |

---

## 5. Open Questions (blocking subset)

| # | Question | Blocks |
|---|---|---|
| OQ-2 | Is `evidence.mentor_session_id` required? | Evidence FK design |
| OQ-4 | Does `knowledge_node` content need version/history? | `history.knowledge_node` |
| OQ-6 / OQ-11 | Stuck Detection mechanism (D9a/D9b) | D9 persistence + events |
| — | Decision Header Approach A/B/C | Header DDL |
| — | GAP-01/02 resolution (persist vs formal exempt) | D1/D5 DDL |
| — | ExpansionRecord ↔ KnowledgeEdge cardinality | Optional FK |

---

## 6. Missing Mechanisms (non-table)

| Mechanism | Required by | Status |
|---|---|---|
| Decision Header + Detail registry | DECISION-048, D1/D6/D7/D9 | Not designed |
| Explainability Integrity Service (transaction bundle) | GAP-07 | Architecture only |
| History trigger function (generic) | DECISION-045 | Not in DDL rounds |
| `version_number` BEFORE UPDATE triggers | DECISION-044 | Not in DDL rounds |
| Event persistence / outbox | Event Architecture | **Not required** (DECISION-035) |
| LearningProfile materialized store | DECISION-036 | **Correctly omitted** |

---

## 7. What Blocks SQL Generation?

| Blocker type | Items | Effect |
|---|---|---|
| **Hard block — full schema** | C-01 (4 entities) | Cannot claim schema complete |
| **Hard block — explainability complete** | C-02, C-03, C-04 | Cannot ship AI features affected |
| **Soft block — quality** | H-01, M-02 | Can generate but should patch design first |
| **Non-blocker** | H-02–H-09, Medium, Low | Application/ops concerns |

### SQL generation gate matrix

| Batch | Can generate? | Conditions |
|---|---|---|
| **DDL R1 (8 tables)** | ✅ **Yes** | Per [DDL_ROUND1_REVIEW.md](DDL_ROUND1_REVIEW.md) READY_FOR_SQL_GENERATION |
| **DDL R2 (7 tables)** | ✅ **Yes** | Per ROUND2 review |
| **DDL R3 (2 tables)** | ✅ **Yes** | Per ROUND3 review; consider H-01 first |
| **Forward FK patch** | ✅ **Yes** | `sub_session.knowledge_node_id` → `knowledge_node` |
| **History schema** | ⚠️ **Partial** | `history.learner` clear; others depend on OQ-4 / Round 4 |
| **Round 4 core (4 tables)** | ❌ **No** | Requires DDL Round 4 **design** first |
| **Decision Header** | ❌ **No** | Mechanism pending |
| **D1/D5 log entities** | ❌ **No** | Founder decision pending |

---

## Liên kết ngược

[DDL_COVERAGE_REVIEW.md](DDL_COVERAGE_REVIEW.md), [DDL_FINALIZATION_READINESS.md](DDL_FINALIZATION_READINESS.md).
