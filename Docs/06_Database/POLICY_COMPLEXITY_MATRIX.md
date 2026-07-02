# Policy Complexity Matrix — Supabase Policy Preparation

> **Round:** Supabase Policy Preparation Review.  
> **Scope:** All 17 tables from DDL Round 1–3.  
> **No SQL. Architecture review only.**

---

## 0. Complexity Scale

| Level | Criteria |
|---|---|
| **Low** | Direct `learner_id = auth.uid()` (0 hop); single ownership path; SELECT-only for `authenticated` |
| **Medium** | 1-hop EXISTS subquery; OR single special column path; append-only write semantics |
| **High** | 2-hop EXISTS; dual read paths (OR); Shared Access role split; sensitive data |
| **Extreme** | 3-hop EXISTS; polymorphic ownership; no physical FK on access path; integrity depends on Application Layer |

---

## 1. Per-Table Complexity Assessment

| # | Table | Complexity | Direct ownership | Join depth | Cross-user visibility | Shared resource | Service writes |
|---|---|---|---|---|---|---|---|
| 1 | `learner` | **Low** | ✅ `id = auth.uid()` | 0 | ❌ | ❌ | ✅ Anonymization only |
| 2 | `goal` | **Low** | ✅ `learner_id` | 0 | ❌ | ❌ | ✅ |
| 3 | `roadmap` | **Medium** | ❌ via `goal` | 1 | ❌ | ❌ | ✅ |
| 4 | `roadmap_node` | **High** | ❌ via `roadmap`→`goal` | 2 | ❌ | ❌ | ✅ |
| 5 | `approval_record` | **High** | ⚠️ dual path | 0 or 2 | ❌ | ❌ | ✅ |
| 6 | `learning_session` | **Low** | ✅ `learner_id` | 0 | ❌ | ❌ | ✅ |
| 7 | `sub_session` | **Medium** | ❌ via `learning_session` | 1 | ❌ | ❌ | ✅ |
| 8 | `learning_session_transition` | **Medium** | ❌ via `learning_session` | 1 | ❌ | ❌ | ✅ append-only |
| 9 | `knowledge_node` | **Medium** | N/A (Shared) | — | ✅ all authenticated | ✅ | ✅ only |
| 10 | `knowledge_edge` | **Medium** | N/A (Shared) | — | ✅ all authenticated | ✅ | ✅ only |
| 11 | `knowledge_node_mastery` | **Low** | ✅ `learner_id` | 0 | ❌ | ⚠️ refs Shared node | ✅ |
| 12 | `evidence` | **Low** | ✅ `learner_id` | 0 | ❌ | ❌ | ✅ |
| 13 | `evidence_link` | **Medium** | ❌ via `evidence` | 1 | ❌ | ⚠️ refs Shared node | ✅ |
| 14 | `assessment_result` | **Low** | ✅ `learner_id` | 0 | ❌ | ⚠️ refs Shared node | ✅ |
| 15 | `trace_link` | **Extreme** | ❌ polymorphic | variable | ❌ (no client access) | ❌ | ✅ only; no auth policies |
| 16 | `roadmap_node_knowledge_node` | **Extreme** | ❌ via 3-hop chain | 3 | ❌ | ⚠️ refs Shared node | ✅ |
| 17 | `expansion_record` | **Medium** | N/A (Shared) | — | ✅ all authenticated | ✅ | ✅ only |

---

## 2. Complexity Drivers Explained

### 2.1 Direct ownership (0-hop) — Low complexity cluster

**Tables:** `learner`, `goal`, `learning_session`, `knowledge_node_mastery`, `evidence`, `assessment_result`

Policy pattern: `learner_id = auth.uid()` or `id = auth.uid()`.

These six tables (plus `learner`) are the **template anchor** for Strict RLS. Reusable with minimal customization (table name only).

### 2.2 Single-hop inheritance — Medium complexity cluster

**Tables:** `roadmap`, `sub_session`, `learning_session_transition`, `evidence_link`

Policy pattern: `EXISTS (SELECT 1 FROM <parent> WHERE <parent>.<pk> = <table>.<fk> AND <parent>.learner_id = auth.uid())`.

One JOIN/subquery in `USING` clause. Template-able with parameterized parent table and FK column.

### 2.3 Multi-hop inheritance — High / Extreme

| Table | Hops | Chain |
|---|---|---|
| `roadmap_node` | 2 | `roadmap_node` → `roadmap` → `goal.learner_id` |
| `approval_record` | 2 | `approval_record` → `roadmap` → `goal.learner_id` |
| `roadmap_node_knowledge_node` | **3** | `roadmap_node_knowledge_node` → `roadmap_node` → `roadmap` → `goal.learner_id` |

**Denormalization option (not decided):** Add `learner_id` to `roadmap` (and propagate to descendants) to collapse 2-hop and 3-hop tables to 0-hop. Trade-off: normalization vs RLS performance ([DDL_ROUND1_DESIGN.md](DDL_ROUND1_DESIGN.md) mục 4, [DDL_ROUND3_DESIGN.md](DDL_ROUND3_DESIGN.md) mục 5 Risk #3).

### 2.4 Dual read path — High (`approval_record`)

Two valid ownership proofs:

1. `approved_by_learner_id = auth.uid()` (0 hop — approver)
2. EXISTS via `roadmap.goal.learner_id` (2 hop — roadmap owner)

Policy requires **OR** composition. Both paths must remain equivalent for the same Learner when they are both owner and approver (no duplicate-row issue — same row, two valid proofs).

### 2.5 Shared resources — Medium (different pattern family)

**Tables:** `knowledge_node`, `knowledge_edge`, `expansion_record`

Not ownership-based. Pattern: `SELECT` for role `authenticated`; **no** INSERT/UPDATE/DELETE policies for `authenticated`. Completely different template from Strict RLS — must not reuse Learner-owned templates.

### 2.6 Never Exposed — Extreme (`trace_link`)

Complexity is **not** in writing a clever `USING` clause — it is in **not exposing** the table at all:

- Polymorphic `source_type`/`source_id`/`target_type`/`target_id` with no physical FK ([DECISION-038](../11_Decisions/DECISION-038-Traceability-Model.md))
- Each type combination resolves ownership differently (assessment_result → direct; recommendation_proposal → not yet DDL; discovery_session → not yet DDL)
- Application Layer is sole integrity guarantor

**Recommended approach:** Enable RLS, grant no policies to `authenticated`, access exclusively via ExplainabilityService under service_role. Optional: security-definer helper function if ever needed — but architecture says avoid client access entirely.

---

## 3. Most Difficult Policies (ranked)

| Rank | Table | Complexity | Primary difficulty |
|---|---|---|---|
| 1 | `trace_link` | Extreme | Polymorphic ownership; Never Exposed; explainability integrity |
| 2 | `roadmap_node_knowledge_node` | Extreme | 3-hop JOIN; performance pressure; D6 explainability gap (no persisted reasoning column yet) |
| 3 | `approval_record` | High | Dual OR paths; governance semantics |
| 4 | `roadmap_node` | High | 2-hop JOIN; tree queries at scale |
| 5 | `roadmap` | Medium–High | Gateway to entire Roadmap subtree; 1-hop but high fan-out |

### Honorable mention (sensitivity, not structural complexity)

| Table | Note |
|---|---|
| `evidence` / `assessment_result` | Low structural complexity but **highest impact** if policy wrong — raw learner data + AI reasoning |
| `knowledge_node_mastery` | Low hop but concurrent write risk (DECISION-044 `version_number`) — RLS does not address write conflicts; Application Layer must |

---

## 4. Multi-Hop Ownership Check Required

| Table | Hops | Requires multi-hop check? |
|---|---|---|
| `roadmap` | 1 | ✅ |
| `roadmap_node` | 2 | ✅ |
| `approval_record` | 0 or 2 | ✅ (dual) |
| `sub_session` | 1 | ✅ |
| `learning_session_transition` | 1 | ✅ |
| `evidence_link` | 1 | ✅ |
| `roadmap_node_knowledge_node` | 3 | ✅ **deepest** |

All other Strict RLS tables: direct column only.

---

## 5. Template Reuse vs Custom Logic Preview

| Template | Applies to | Custom needed |
|---|---|---|
| **T1: Direct learner** | 6 tables | None |
| **T2: Single-hop EXISTS** | 4 tables | Parent table + FK names |
| **T3: Two-hop EXISTS** | 2 tables (`roadmap_node`, `approval_record` path B) | Chain definition |
| **T4: Three-hop EXISTS** | 1 table (`roadmap_node_knowledge_node`) | Full chain or denormalize |
| **T5: Dual-path OR** | 1 table (`approval_record`) | Custom OR |
| **T6: Shared read** | 3 tables | None |
| **T7: Never Exposed** | 1 table (`trace_link`) | Deny-all for authenticated |

Detail in [POLICY_AUTHORING_PREPARATION.md](POLICY_AUTHORING_PREPARATION.md).

---

## Liên kết ngược

[TABLE_SECURITY_CLASSIFICATION.md](TABLE_SECURITY_CLASSIFICATION.md), [ACCESS_PATH_ANALYSIS.md](ACCESS_PATH_ANALYSIS.md), [RLS_RISK_REVIEW.md](RLS_RISK_REVIEW.md), [POLICY_AUTHORING_PREPARATION.md](POLICY_AUTHORING_PREPARATION.md).
