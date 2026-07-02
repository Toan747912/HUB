# Canonical Table Catalog

## 1. Catalog Purpose

CanonicalTableCatalog defines the canonical table set for WP-02 and classifies each table by:
- domain
- ownership
- lifecycle type
- canonical status
- supersedence role

Status values:
- Existing (present in Batch 0–5 artifacts)
- Planned (canonical target, not confirmed as physical in Batch 0–5)
- Merge Candidate
- Deprecated Candidate

---

## 2. Core Domain Catalog

| Canonical Table | Domain | Write Owner | Lifecycle Type | Status | Notes |
|---|---|---|---|---|---|
| `learner` | Identity | Identity | Current-state snapshot | Existing | Identity anchor entity |
| `learner_goal` | Goal | Goal & Roadmap | Current-state/lifecycle | Planned | Canonical goal entity pending physical confirmation |
| `goal_progress` | Goal | Goal & Roadmap | Append/update hybrid | Planned | Progress signal ledger |
| `roadmap` | Roadmap | Goal & Roadmap | Current-state snapshot | Existing | Roadmap root |
| `roadmap_node` | Roadmap | Goal & Roadmap | Hierarchical snapshot | Existing | Roadmap structure |
| `roadmap_node_knowledge_node` | Roadmap | Goal & Roadmap | Bridge relation | Existing | Mapping bridge; strong ownership at roadmap side |
| `knowledge_node` | Knowledge | Knowledge Graph | Current-state (+history policy) | Existing | Knowledge root node |
| `expansion_record` | Knowledge | Knowledge Graph | Append decision record | Existing | Expansion lineage |
| `evidence` | Evidence | Evidence | Append-dominant | Existing | Evidence capture root |
| `evidence_link` | Evidence | Evidence | Bridge/link append | Existing | Evidence contextual linking |
| `assessment_result` | Assessment | Assessment | Append result record | Existing | Assessment output |
| `knowledge_node_mastery` | Assessment | Assessment | Mutable snapshot + versioning | Existing | Sole assessment-owned mastery |
| `discovery_session` | Discovery | Discovery | Mutable lifecycle snapshot | Existing | Discovery orchestration state |
| `self_assessment_mismatch` | Discovery | Discovery | Append-dominant signal | Existing | Mismatch analytics signal |
| `recommendation_proposal` | Recommendation | Recommendation | Proposal lifecycle state | Existing | Proposal-only domain artifact |
| `recommendation_proposal_response` | Recommendation | Recommendation | Append response ledger | Existing | Proposal response stream |
| `learning_session` | Learning Session | Learning Session | Mutable coordinator state | Existing | Session coordinator root |
| `learning_session_transition` | Learning Session | Learning Session | Append transition ledger | Existing | Session transitions |
| `sub_session` | Learning Session | Learning Session | Mutable lifecycle subset | Existing | Session partitioning |
| `mentor_session` | Mentor Interaction | Mentor Interaction | Mutable lifecycle snapshot (+history policy) | Existing | Canonical owner: Mentor Interaction |
| *(none)* | Teaching | Teaching (orchestration-only) | N/A | Existing policy | No canonical write-owned aggregate table |
| *(none)* | AI Runtime | AI Runtime capability boundary | N/A | Existing policy | No canonical persisted aggregate table in current freeze |

---

## 3. Supporting / Cross-Cutting Catalog

| Canonical Table | Domain | Write Owner | Lifecycle Type | Status | Notes |
|---|---|---|---|---|---|
| `decision_header` | Decision Persistence | Decision Persistence | Append-only | Existing | Canonical decision envelope |
| `teaching_decision_detail` | Decision Persistence | Decision Persistence | Append-only | Existing | Teaching decision detail |
| `local_expansion_decision_detail` | Decision Persistence | Decision Persistence | Append-only | Existing | Knowledge expansion decision detail |
| `roadmap_mapping_decision_detail` | Decision Persistence | Decision Persistence | Append-only | Existing | Mapping decision detail |
| `stuck_detection_decision_detail` | Decision Persistence | Decision Persistence | Append-only | Existing | Stuck detection decision detail |
| `intervention_decision_detail` | Decision Persistence | Decision Persistence | Append-only | Existing | Intervention decision detail |
| `trace_link` | Explainability | Explainability | Append trace graph | Existing | Explainability link graph |

---

## 4. Canonical Duplicate and Merge Assessment

## 4.1 Confirmed duplicate tables
- None confirmed as physical duplicates in current frozen baseline.

## 4.2 Semantic overlap (non-duplicate)
- Decision detail tables have repeated structural patterns by design (type-specific persistence separation).
- Session-related tables (`learning_session`, `sub_session`, `mentor_session`) are complementary ownership scopes, not duplicates.

## 4.3 Merge candidates
- No mandatory physical merge candidates in WP-02 baseline.
- Optional future read-model harmonization candidates:
  - decision detail reporting views
  - session analytics projection unification

---

## 5. Supersedence Mapping (Batch 0–5 to Canonical)

Supersedence policy:
1. Existing tables retain identifiers unless canonical naming correction is decision-approved.
2. Planned canonical entities remain tagged and excluded from migration planning in WP-02.
3. Deprecated candidate status requires explicit decision before operational impact.
4. Canonical owner assignment supersedes implicit ownership assumptions from draft artifacts.

---

## 6. Ownership/Boundary Compliance Markers

Each catalog table is expected to satisfy:
- one write owner
- no forbidden cross-domain write path
- event and FK classification alignment
- audit and lifecycle policy attachment

Authoritative references:
- `Table_Ownership_Matrix.md`
- `Domain_Boundary_Matrix.md`
- `Event_Ownership_Matrix.md`
- `Cross_Domain_FK_Strategy.md`

---

## 7. Catalog Control Notes

- This catalog is schema-governance metadata.
- It does not generate DDL.
- Any table addition/removal/status change requires architecture governance approval.
