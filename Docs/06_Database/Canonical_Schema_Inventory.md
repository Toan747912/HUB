# Canonical Schema Inventory

## 1. Purpose

This inventory consolidates schema assets by domain and identifies:
- canonical tables
- candidate duplicates
- merge candidates
- tables requiring redesign

For each domain table group, the inventory includes:
- table name
- purpose
- aggregate ownership
- state model
- versioning strategy
- soft delete strategy
- audit requirements

---

## 2. Domain: Goal

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `learner_goal` | Learner goal definition and objective root | Goal | Current-state + lifecycle transitions | Goal-level version marker (where defined) | Prefer status/archive over hard delete | created/updated actor + timestamps; domain transition trace |
| `goal_progress` | Progress signals against goal outcomes | Goal | Append/update hybrid by checkpoint | Derived from goal revision context | No physical delete in operational window | actor, timestamp, source reason |

---

## 3. Domain: Roadmap

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `roadmap` | Roadmap header and lifecycle ownership | Goal & Roadmap | Current-state snapshot | `version_number` style lifecycle versioning (domain-managed) | status/archive semantics | created/updated actor + timestamps |
| `roadmap_node` | Roadmap structural nodes and dependency graph | Goal & Roadmap | Current-state hierarchical | follows roadmap version lineage | archive/inactive flags | actor + timestamp; parent-child integrity audit |
| `roadmap_node_knowledge_node` | Mapping bridge between roadmap nodes and knowledge nodes | Goal & Roadmap (write owner) | Relationship state | inherited from roadmap revision context | remove via lifecycle-controlled update, not ad-hoc delete | linkage trace + actor context |

---

## 4. Domain: Knowledge

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `knowledge_node` | Knowledge graph node definition | Knowledge Graph | Current-state snapshot + optional history mirror | domain revision + optional `version_number` patterns | archive/inactive model preferred | full actor/timestamp; explainability linkage |
| `expansion_record` | Knowledge expansion decisions and outcomes | Knowledge Graph | Append-oriented decision record | immutable decision lineage by header linkage | no soft delete; deprecate via status | decision trace + reasoning audit |

---

## 5. Domain: Evidence

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `evidence` | Captured learner evidence artifacts/signals | Evidence | Append-dominant with state updates if needed | evidence revision as append history | retention policy over delete | source metadata, actor, timestamps |
| `evidence_link` | Link evidence to contextual entities | Evidence | Relationship state | inherited from evidence lifecycle | remove through controlled unlink events | linkage trace + actor metadata |

---

## 6. Domain: Assessment

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `assessment_result` | Assessment outcomes from evidence evaluation | Assessment | Append-dominant results | immutable result record + references | no soft delete; supersede by new result | decision/reasoning trace + actor metadata |
| `knowledge_node_mastery` | Mastery state for learner-node pair | Assessment (sole owner) | Current-state snapshot + history-compatible | `version_number` or optimistic concurrency marker | no hard delete in normal operation | actor/timestamp + assessment linkage integrity |

---

## 7. Domain: Discovery

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `discovery_session` | Discovery process session and state progression | Discovery | Current-state + transition/historical mirror | session revision by transition timeline | archive/closed status | actor/timestamp + mismatch trace |
| `self_assessment_mismatch` | Self-report vs computed mismatch records | Discovery | Append-dominant signal record | immutable mismatch event lineage | no soft delete; close by status | reasoning and explainability trace |

---

## 8. Domain: Recommendation

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `recommendation_proposal` | Recommendation proposals for learner action | Recommendation (proposal-only) | Append/update by proposal lifecycle | proposal revision/status transitions | close/expire status instead of delete | signal trace + actor/timestamps |
| `recommendation_proposal_response` | Learner/system response to recommendation | Recommendation | Append response log | immutable response event sequence | no soft delete in core flow | response actor/time + proposal linkage |

---

## 9. Domain: Learning Session

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `learning_session` | Session coordinator state | Learning Session (coordinator-only) | Current-state + transitions | lifecycle revision by transition ledger | archive state | actor/timestamps + guard-state audit |
| `learning_session_transition` | Transition event history | Learning Session | Append-only | immutable transition sequence | no delete in normal operations | full transition provenance |
| `sub_session` | Sub-session partitioning under learning session | Learning Session | Current-state + lifecycle | derived from session transition sequencing | close/archive semantics | actor/timestamp + session linkage |

**Cross-reference:** `mentor_session` is referenced by Learning Session coordination flows but is **not owned** by Learning Session.

---

## 10. Domain: Mentor Interaction / Teaching

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `mentor_session` | Mentor interaction runtime session container | Mentor Interaction (canonical owner) | Current-state + history mirror | session revision timeline | archive/close | actor/timestamp + mode transition trace |
| *(No canonical write-owned aggregate table for Teaching in current frozen model)* | Teaching remains orchestration/capability layer | Teaching is orchestration-only | Runtime orchestration state (non-aggregate-owned) | N/A (state externalized via owner domains + decision records) | N/A | decision linkage and invocation trace required |

---

## 11. Domain: AI Runtime

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| *(No canonical domain-owned table in frozen baseline)* | Runtime invocation capability path | AI Runtime capability boundary | Runtime execution state, provider-dependent | N/A for core schema; driven by invocation contracts | N/A | invocation trace, provider outcome, latency/error telemetry |

---

## 12. Shared Infrastructure / Cross-Cutting

| Table Name | Purpose | Aggregate Ownership | State Model | Versioning Strategy | Soft Delete Strategy | Audit Requirements |
|---|---|---|---|---|---|---|
| `decision_header` | Canonical decision envelope | Decision Persistence (supporting) | Append-only decision registry | immutable decision record | no delete | full decision provenance |
| `teaching_decision_detail` | Decision detail for teaching decisions | Decision Persistence | Append-only | immutable by decision id | no delete | reasoning and actor trace |
| `local_expansion_decision_detail` | Decision detail for local expansion | Decision Persistence | Append-only | immutable | no delete | reasoning and linkage trace |
| `roadmap_mapping_decision_detail` | Decision detail for roadmap mapping | Decision Persistence | Append-only | immutable | no delete | mapping reasoning trace |
| `stuck_detection_decision_detail` | Decision detail for stuck detection | Decision Persistence | Append-only | immutable | no delete | detection reasoning trace |
| `intervention_decision_detail` | Decision detail for intervention | Decision Persistence | Append-only | immutable | no delete | intervention rationale trace |
| `trace_link` | Explainability trace relationships | Explainability (supporting) | Append-oriented trace graph | immutable trace records | no delete | source-target trace integrity |

---

## 13. Canonical Tables

Canonical baseline tables include (non-exhaustive by domain anchor):
- `roadmap`, `roadmap_node`, `roadmap_node_knowledge_node`
- `knowledge_node`, `expansion_record`
- `evidence`, `evidence_link`
- `assessment_result`, `knowledge_node_mastery`
- `discovery_session`, `self_assessment_mismatch`
- `recommendation_proposal`, `recommendation_proposal_response`
- `learning_session`, `learning_session_transition`, `sub_session`
- `mentor_session` (Mentor Interaction canonical owner)
- `decision_header` + detail tables
- `trace_link`

---

## 14. Candidate Duplicates

Current review indicates no hard duplicate canonical business tables in the frozen SQL baseline.  
Potential semantic overlap to monitor:
- Decision detail tables with similar reasoning fields (intentional by decision-type separation, not duplicates).
- Session-level records across `learning_session`, `sub_session`, `mentor_session` (complementary roles, not duplicates).

---

## 15. Merge Candidates

No immediate merge candidates are recommended under frozen architecture constraints.  
Potential future optimization candidates (post-freeze review only):
- Harmonization of structurally similar decision detail tables into abstracted projection/reporting views (not physical merge).
- Consolidated read models for session analytics (projection-level merge, not write-model merge).

---

## 16. Tables Requiring Redesign (Flagged, Not Executed)

1. `trace_link` enum coverage extension path where unresolved explainability target gaps remain (decision-governed).
2. Cross-cutting policy model around decision/trace tables for strict RLS behavior (security design refinement, not schema redesign here).
3. Optional future convergence strategy for high-overlap decision detail reporting structures (read-model concern).

No redesign is executed in this package.

---

## 17. Appendix — Canonical_Physical_Reconciliation

| Canonical Name | Physical Table Name | Source Batch | Status |
|---|---|---|---|
| Learner | `learner` | Batch 1 | Existing |
| LearnerGoal | `learner_goal` | Planned mapping (not confirmed in Batch 0–5 SQL names) | Planned |
| GoalProgress | `goal_progress` | Planned mapping (not confirmed in Batch 0–5 SQL names) | Planned |
| Roadmap | `roadmap` | Batch 1 | Existing |
| RoadmapNode | `roadmap_node` | Batch 1 | Existing |
| RoadmapKnowledgeMapping | `roadmap_node_knowledge_node` | Batch 3 | Existing |
| KnowledgeNode | `knowledge_node` | Batch 2 | Existing |
| ExpansionRecord | `expansion_record` | Batch 2 | Existing |
| Evidence | `evidence` | Batch 2 | Existing |
| EvidenceLink | `evidence_link` | Batch 2 | Existing |
| AssessmentResult | `assessment_result` | Batch 2 | Existing |
| KnowledgeNodeMastery | `knowledge_node_mastery` | Batch 2 | Existing |
| DiscoverySession | `discovery_session` | Batch 3 | Existing |
| SelfAssessmentMismatch | `self_assessment_mismatch` | Batch 3 | Existing |
| RecommendationProposal | `recommendation_proposal` | Batch 3 | Existing |
| RecommendationProposalResponse | `recommendation_proposal_response` | Batch 3 | Existing |
| LearningSession | `learning_session` | Batch 3 | Existing |
| LearningSessionTransition | `learning_session_transition` | Batch 3 | Existing |
| SubSession | `sub_session` | Batch 3 | Existing |
| MentorSession | `mentor_session` | Batch 3 | Existing |
| DecisionHeader | `decision_header` | Batch 4 | Existing |
| TeachingDecisionDetail | `teaching_decision_detail` | Batch 4 | Existing |
| LocalExpansionDecisionDetail | `local_expansion_decision_detail` | Batch 4 | Existing |
| RoadmapMappingDecisionDetail | `roadmap_mapping_decision_detail` | Batch 4 | Existing |
| StuckDetectionDecisionDetail | `stuck_detection_decision_detail` | Batch 4 | Existing |
| InterventionDecisionDetail | `intervention_decision_detail` | Batch 4 | Existing |
| TraceLink | `trace_link` | Batch 2 (+ extensions in later reviews) | Existing |
