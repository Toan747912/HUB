# Explainability Persistence Review — DDL Finalization

> **Round:** DDL Finalization Review.  
> **Scope:** DECISION-027, DECISION-038, DECISION-048 vs DDL Round 1–3. Focus: D1, D6, D7, D9a, D9b.  
> **No SQL. Review only.**

---

## 0. Framework

| Decision | Role in persistence |
|---|---|
| **DECISION-027** | Original Explainability First — reasoning + trace for Mastery, Recommendation, Expansion |
| **DECISION-038** | `TraceLink` as centralized backward provenance (polymorphic, no FK on business tables) |
| **DECISION-048** | All C1–C4 AI decisions explainable — persistence and explainability are **independent axes**; D8 uses Runtime Reconstruction |

**Two persistence mechanisms today:**

1. **Detail tables** — domain-owned rows with reasoning columns (`assessment_result.reasoning`, `expansion_record.expansion_reason`)
2. **TraceLink** — cross-cutting edges (`trace_link`) linking results to sources

**Third mechanism pending:** Decision Header (forward registry) — not designed ([HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md))

---

## 1. Decision Type Persistence Map

| ID | Decision type | Explainability required | Persistence path today | Status |
|---|---|---|---|---|
| **D1** | Teaching — Content Selection | ✅ DECISION-048 | **None** | ❌ GAP-01 Critical |
| **D2** | Assessment — Evidence Verdict | ✅ locked | `assessment_result` + `trace_link` → `evidence` | ✅ Implemented |
| **D3** | Recommendation — Signal Synthesis | ✅ locked | **`recommendation_proposal` missing** + `trace_link` enum ready | ❌ Round 4 |
| **D4** | Knowledge Expansion — Deep/Structural | ✅ locked | `expansion_record.expansion_reason` + `knowledge_edge` | ✅ Implemented |
| **D5** | Knowledge Expansion — Local | ✅ locked | **No log entity/column** | ❌ GAP-02 Critical |
| **D6** | Roadmap — Dependency Edge Selection | ✅ DECISION-048 | `roadmap_node_knowledge_node` **without reason column**; fallback `approval_record.change_description` (coarse) | ⚠️ GAP-05 High |
| **D7** | Discovery — Self-Assessment Mismatch | ✅ DECISION-048 | **`discovery_session` / `self_assessment_mismatch` missing** | ❌ Round 4 |
| **D8** | Mentor — Mode Selection | ✅ Runtime Reconstruction | `mentor_session` **missing**; no persisted decision record (by design) | ⚠️ Inputs unverified |
| **D9a** | Stuck Detection | ✅ DECISION-048 | **No mechanism** (Open Q#6/#11) | ❌ Blocked |
| **D9b** | Intervention Tier Selection | ✅ DECISION-048 | **No mechanism** (Open Q#6/#11) | ❌ Blocked |

---

## 2. What Already Has Tables, Relationships, Paths

### 2.1 Fully supported (D2, D4)

```
Evidence → AssessmentResult (assessment_result.reasoning, 8 fields)
                ↓ trace_link (≥1 row, Application-enforced)
           Evidence / EvidenceLink
                ↓
KnowledgeNodeMastery.last_assessment_result_id (FK NOT NULL)
```

```
KnowledgeNode ← expansion_record.expansion_reason (CHECK not empty)
              ← knowledge_edge (append-only, no link to expansion_record)
```

### 2.2 Infrastructure ready, entity missing (D3, partial D7)

| Component | Status |
|---|---|
| `trace_link.source_type` includes `recommendation_proposal` | ✅ Enum in DDL R2 |
| `trace_link.target_type` includes `discovery_session` | ✅ Enum in DDL R2 |
| `recommendation_proposal` table | ❌ |
| `discovery_session` / `self_assessment_mismatch` | ❌ |

### 2.3 Partial support (D6)

| Has | Missing |
|---|---|
| `roadmap_node_knowledge_node` FK graph | `dependency_reason` or equivalent |
| `approval_record.change_description` (roadmap-level) | Per-edge granularity |
| `trace_link` could add `local_expansion` / future source types | No D6-specific Detail table |

### 2.4 No support (D1, D5, D9a, D9b)

| ID | Required by DECISION-048 | Current storage |
|---|---|---|
| D1 | Reason + selected content refs | **0% — nothing persisted** |
| D5 | Internal trace reason for local edge | **0% — only `knowledge_edge` row, no reason** |
| D9a | Stuck signal + reasoning | **No entity** |
| D9b | Tier choice + reasoning | **No entity** |

---

## 3. TraceLink Coverage Analysis

| Source type (designed) | Target types | Backing table exists? |
|---|---|---|
| `assessment_result` | `evidence`, `assessment_result`, `discovery_session` | ✅ / ✅ / ❌ |
| `recommendation_proposal` | same | ❌ |
| `local_expansion` | same | ❌ (D5 — no registration point) |

**Integrity:** No DB constraint requires ≥1 `trace_link` per `assessment_result` (GAP-04). Application Layer + ExplainabilityService must enforce same-transaction write.

---

## 4. Decision Header — Is It Required?

| Question | Answer |
|---|---|
| Is Header **mandatory** for SQL generation of R1–3 tables? | **No** — existing Detail + TraceLink suffice for D2/D4 |
| Is Header **required** for full DECISION-048 compliance? | **Yes, for practical completeness** — especially D1, D8 registry, and cross-decision timeline queries |
| Can Header replace TraceLink? | **No** — [HEADER_TRACELINK_BOUNDARY_REVIEW.md](HEADER_TRACELINK_BOUNDARY_REVIEW.md): partially overlapping, not substitutable |
| Recommended approach | **Header/Detail (Approach C)** per [SHARED_DECISION_PERSISTENCE_REVIEW.md](SHARED_DECISION_PERSISTENCE_REVIEW.md) — Header for forward registry; existing Detail tables + TraceLink for backward provenance |
| Blocker | **Mechanism not chosen** — cannot write Header DDL until Founder selects Approach A/B/C and Header schema |

**Verdict:** Decision Header is **required before production** and **before closing GAP-01/06/07**, but **not required to generate SQL for the 17 existing tables**.

---

## 5. Remaining Explainability Gaps (consolidated)

| ID | Gap | Severity | Blocks SQL for R1–3? |
|---|---|---|---|
| GAP-01 | D1 no persistence | Critical | No |
| GAP-02 | D5 no internal reason | Critical | No |
| GAP-04 | assessment_result ↔ trace_link not DB-enforced | High | No |
| GAP-05 | D6 no per-edge reason | High | No (optional column) |
| GAP-06 | D7 entities missing | Medium | No (Round 4) |
| GAP-07 | No centralized enforcement service | High | No |
| — | ExpansionRecord ↔ KnowledgeEdge | Medium | No |
| — | Decision Header pending | High | No for R1–3; Yes for full compliance |

---

## 6. D1 / D6 / D7 / D9a / D9b — Detailed Gap Notes

### D1 — Teaching Content Selection
- **Highest frequency** decision in the system
- No Teaching Decision Log, no Header registration, no TraceLink source type
- **Mitigation options (not chosen):** lightweight append-only log; Header+Detail; accept ephemeral with formal Decision (conflicts with DECISION-048)

### D6 — Dependency Edge Selection
- Table exists (`roadmap_node_knowledge_node`) since Round 3
- **Missing:** `dependency_reason` text or linked Detail row
- **Workaround:** `approval_record` at node level — insufficient when multiple edges added in one approval

### D7 — Self-Assessment Mismatch
- Requires `discovery_session` + `self_assessment_mismatch` with reasoning column (design TBD)
- Recommendation `trace_link` targets `discovery_session` — **chain broken** until Round 4

### D9a / D9b — Stuck Detection & Intervention Tier
- Blocked by Open Questions #6/#11 (detection mechanism)
- No DDL possible until domain mechanism locked
- Event catalog lists as candidate events only — not persisted

---

## Liên kết ngược

[DDL_COVERAGE_REVIEW.md](DDL_COVERAGE_REVIEW.md), [DECISION_TRACEABILITY_REVIEW.md](DECISION_TRACEABILITY_REVIEW.md), [EXPLAINABILITY_GAP_ANALYSIS.md](EXPLAINABILITY_GAP_ANALYSIS.md), [DDL_GAP_CONSOLIDATION.md](DDL_GAP_CONSOLIDATION.md).
