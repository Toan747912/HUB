# Physical Table Mapping Matrix

## 1. Purpose

Map canonical table targets to Batch 0–5 physical SQL artifacts with explicit mapping status for physical consolidation planning.

Status classes:
- Exact Match
- Legacy Alias
- Multi-Source Consolidation
- Planned-Only Canonical
- Physical Orphan Candidate

---

## 2. Mapping Matrix

| Canonical Table | Domain | Canonical Owner | Physical Source (Batch 0–5) | Mapping Status | Notes |
|---|---|---|---|---|---|
| `learner` | Identity | Identity | `learner` | Exact Match | Stable identity anchor |
| `learner_goal` | Goal | Goal & Roadmap | *(not confirmed in Batch 0–5 SQL names)* | Planned-Only Canonical | Requires explicit future physical introduction decision |
| `goal_progress` | Goal | Goal & Roadmap | *(not confirmed in Batch 0–5 SQL names)* | Planned-Only Canonical | Canonical progress construct |
| `roadmap` | Roadmap | Goal & Roadmap | `roadmap` | Exact Match | Canonical lifecycle root |
| `roadmap_node` | Roadmap | Goal & Roadmap | `roadmap_node` | Exact Match | Canonical structure node |
| `roadmap_node_knowledge_node` | Roadmap | Goal & Roadmap | `roadmap_node_knowledge_node` | Exact Match | Bridge table, owner-preserving |
| `knowledge_node` | Knowledge | Knowledge Graph | `knowledge_node` | Exact Match | Canonical knowledge root |
| `expansion_record` | Knowledge | Knowledge Graph | `expansion_record` | Exact Match | Knowledge expansion lineage |
| `evidence` | Evidence | Evidence | `evidence` | Exact Match | Evidence capture root |
| `evidence_link` | Evidence | Evidence | `evidence_link` | Exact Match | Evidence contextual linkage |
| `assessment_result` | Assessment | Assessment | `assessment_result` | Exact Match | Assessment output |
| `knowledge_node_mastery` | Assessment | Assessment | `knowledge_node_mastery` | Exact Match | Sole assessment-owned mastery table |
| `discovery_session` | Discovery | Discovery | `discovery_session` | Exact Match | Discovery session state |
| `self_assessment_mismatch` | Discovery | Discovery | `self_assessment_mismatch` | Exact Match | Discovery mismatch signal |
| `recommendation_proposal` | Recommendation | Recommendation | `recommendation_proposal` | Exact Match | Proposal-only ownership preserved |
| `recommendation_proposal_response` | Recommendation | Recommendation | `recommendation_proposal_response` | Exact Match | Response append ledger |
| `learning_session` | Learning Session | Learning Session | `learning_session` | Exact Match | Coordinator session root |
| `learning_session_transition` | Learning Session | Learning Session | `learning_session_transition` | Exact Match | Transition ledger |
| `sub_session` | Learning Session | Learning Session | `sub_session` | Exact Match | Session partition entity |
| `mentor_session` | Mentor Interaction | Mentor Interaction | `mentor_session` | Exact Match | Canonical owner remains Mentor Interaction |
| `decision_header` | Decision Persistence | Decision Persistence | `decision_header` | Exact Match | Canonical decision envelope |
| `teaching_decision_detail` | Decision Persistence | Decision Persistence | `teaching_decision_detail` | Exact Match | Decision detail specialization |
| `local_expansion_decision_detail` | Decision Persistence | Decision Persistence | `local_expansion_decision_detail` | Exact Match | Decision detail specialization |
| `roadmap_mapping_decision_detail` | Decision Persistence | Decision Persistence | `roadmap_mapping_decision_detail` | Exact Match | Decision detail specialization |
| `stuck_detection_decision_detail` | Decision Persistence | Decision Persistence | `stuck_detection_decision_detail` | Exact Match | Decision detail specialization |
| `intervention_decision_detail` | Decision Persistence | Decision Persistence | `intervention_decision_detail` | Exact Match | Decision detail specialization |
| `trace_link` | Explainability | Explainability | `trace_link` | Exact Match | Explainability lineage graph |

---

## 3. Physical Orphan Candidate Register

Current documentation-stage assessment:
- No confirmed physical orphan table has been identified from the canonical-inventory-covered set.
- Potential orphan detection outside covered table list remains pending full DDL line-by-line reconciliation execution stage.

---

## 4. Duplicate Physical Table Candidate Register

Current planning-stage assessment:
- No confirmed physical duplicate canonical target tables in Batch 0–5 coverage set.
- Semantic overlap exists but remains intentionally separated:
  - decision detail tables (specialized by decision type)
  - session tables by ownership scope

---

## 5. Ownership Compliance Snapshot

Validation snapshot for mapped tables:
- Single write owner per mapped canonical table: Yes
- mentor_session owner conflict: No
- Recommendation boundary drift: No
- Assessment mastery ownership drift: No

---

## 6. Mapping Integrity Summary

| Category | Count |
|---|---:|
| Exact Match | 27 |
| Legacy Alias | 0 |
| Multi-Source Consolidation | 0 |
| Planned-Only Canonical | 2 |
| Physical Orphan Candidate (confirmed) | 0 |

Planning interpretation:
- Physical mapping is highly aligned with canonical baseline.
- Planned-only canonical entities remain explicitly non-physical in current baseline and are tracked for future governance.
