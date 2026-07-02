# Canonical to Legacy Mapping

## 1. Purpose

Provide deterministic mapping between WP-02 canonical schema artifacts and legacy/draft-era Batch 0–5 physical naming and structure references.

Goal:
- eliminate ambiguity during physical consolidation planning
- preserve governance baseline semantics
- detect alias and translation points

---

## 2. Mapping Model

Mapping status:
- Direct
- Legacy Alias
- Composite Legacy
- Planned Canonical (no legacy counterpart)
- Legacy Deprecated Candidate

Mapping confidence:
- High: explicit table-level parity exists
- Medium: conceptual mapping with structural assumptions
- Low: requires further reconciliation evidence

---

## 3. Canonical-to-Legacy Table Mapping

| Canonical Table | Legacy/Batch Physical Name | Mapping Status | Confidence | Notes |
|---|---|---|---|---|
| `learner` | `learner` | Direct | High | Stable identity table |
| `learner_goal` | *(none confirmed)* | Planned Canonical | Medium | Canonical concept, pending physical introduction decision |
| `goal_progress` | *(none confirmed)* | Planned Canonical | Medium | Canonical concept, no Batch 0–5 parity confirmed |
| `roadmap` | `roadmap` | Direct | High | Direct parity |
| `roadmap_node` | `roadmap_node` | Direct | High | Direct parity |
| `roadmap_node_knowledge_node` | `roadmap_node_knowledge_node` | Direct | High | Direct parity |
| `knowledge_node` | `knowledge_node` | Direct | High | Direct parity |
| `expansion_record` | `expansion_record` | Direct | High | Direct parity |
| `evidence` | `evidence` | Direct | High | Direct parity |
| `evidence_link` | `evidence_link` | Direct | High | Direct parity |
| `assessment_result` | `assessment_result` | Direct | High | Direct parity |
| `knowledge_node_mastery` | `knowledge_node_mastery` | Direct | High | Direct parity |
| `discovery_session` | `discovery_session` | Direct | High | Direct parity |
| `self_assessment_mismatch` | `self_assessment_mismatch` | Direct | High | Direct parity |
| `recommendation_proposal` | `recommendation_proposal` | Direct | High | Direct parity |
| `recommendation_proposal_response` | `recommendation_proposal_response` | Direct | High | Direct parity |
| `learning_session` | `learning_session` | Direct | High | Direct parity |
| `learning_session_transition` | `learning_session_transition` | Direct | High | Direct parity |
| `sub_session` | `sub_session` | Direct | High | Direct parity |
| `mentor_session` | `mentor_session` | Direct | High | Canonical owner fixed in WP-01 |
| `decision_header` | `decision_header` | Direct | High | Direct parity |
| `teaching_decision_detail` | `teaching_decision_detail` | Direct | High | Direct parity |
| `local_expansion_decision_detail` | `local_expansion_decision_detail` | Direct | High | Direct parity |
| `roadmap_mapping_decision_detail` | `roadmap_mapping_decision_detail` | Direct | High | Direct parity |
| `stuck_detection_decision_detail` | `stuck_detection_decision_detail` | Direct | High | Direct parity |
| `intervention_decision_detail` | `intervention_decision_detail` | Direct | High | Direct parity |
| `trace_link` | `trace_link` | Direct | High | Direct parity |

---

## 4. Canonical Field-Level Legacy Mapping Patterns

## 4.1 Identity fields
Canonical:
- `<entity>_id`

Legacy pattern status:
- Generally aligned in Batch 0–5
- no significant alias drift recorded in current planning scope

## 4.2 Audit fields
Canonical:
- `created_at`, `updated_at`, `created_by_actor_type`, `updated_by_actor_type`

Legacy pattern status:
- `created_at` / `updated_at` broadly present by lifecycle class
- actor columns vary by table class and require strategy normalization in migration planning

## 4.3 Versioning fields
Canonical:
- `version_number` for mutable conflict-sensitive entities

Legacy pattern status:
- present in selected artifacts, unevenly applied by design phase
- reconciliation handled in `AuditAndVersioningMigrationStrategy.md`

## 4.4 Decision/trace fields
Canonical:
- decision linkage via `decision_header_id`
- polymorphic trace references via trace standards

Legacy pattern status:
- aligned conceptually in Batch 4 + trace model
- requires continuity controls in explainability migration strategy

---

## 5. Legacy Alias Register

Confirmed aliases requiring semantic governance:
- None confirmed at table-name level in current baseline.

Potential semantic alias risks:
- “session” terms across `learning_session`, `sub_session`, `mentor_session`
- decision-detail tables with structurally similar payload patterns

Mitigation:
- ownership and purpose disambiguation remains mandatory in mapping usage.

---

## 6. Legacy Deprecated Candidate Register

Current planning-stage register:
- No confirmed deprecated physical table candidates in covered canonical scope.

Future candidate trigger conditions:
1. table has no canonical target,
2. table violates locked ownership/boundary decisions,
3. table is superseded by canonicalized equivalent with approved migration strategy.

---

## 7. Mapping Controls

1. No implicit remapping by name similarity only.
2. Planned canonical tables must remain flagged “non-physical”.
3. Any mapping conflict must be entered into risk register before migration planning.
4. Mapping changes require governance review.

---

## 8. Coverage Summary

| Coverage Dimension | Status |
|---|---|
| Canonical tables mapped | Complete (with Planned flags where needed) |
| Legacy aliases identified | No hard aliases confirmed |
| Ownership-safe mapping | Preserved |
| Boundary-safe mapping | Preserved |
| Explainability/decision lineage continuity | Preserved at planning level |
