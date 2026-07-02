# Table Ownership Matrix

## Ownership Rule
Each table has exactly one write owner.

Columns:
- Owning domain
- Write owner
- Read consumers
- Event producers
- Event consumers

---

| Table | Owning Domain | Write Owner (Exactly One) | Read Consumers | Event Producers | Event Consumers |
|---|---|---|---|---|---|
| `learner` | Identity | Identity | Goal & Roadmap, Learning Session, Recommendation, Teaching | Identity | Goal & Roadmap, Learning Session |
| `learner_goal` | Goal | Goal & Roadmap | Learning Session, Recommendation, Teaching | Goal & Roadmap | Learning Session |
| `goal_progress` | Goal | Goal & Roadmap | Recommendation, Teaching, Learning Profile | Goal & Roadmap | Recommendation |
| `roadmap` | Roadmap | Goal & Roadmap | Learning Session, Teaching, Recommendation | Goal & Roadmap | Learning Session, Recommendation |
| `roadmap_node` | Roadmap | Goal & Roadmap | Knowledge, Teaching | Goal & Roadmap | Knowledge |
| `roadmap_node_knowledge_node` | Roadmap | Goal & Roadmap | Knowledge, Recommendation, Teaching | Goal & Roadmap | Knowledge, Recommendation |
| `knowledge_node` | Knowledge | Knowledge Graph | Assessment, Recommendation, Teaching | Knowledge Graph | Assessment, Teaching |
| `expansion_record` | Knowledge | Knowledge Graph | Assessment, Explainability | Knowledge Graph | Recommendation (indirect), Explainability |
| `evidence` | Evidence | Evidence | Assessment, Discovery, Recommendation, Mentor Interaction | Evidence | Assessment |
| `evidence_link` | Evidence | Evidence | Assessment, Explainability | Evidence | Assessment, Explainability |
| `assessment_result` | Assessment | Assessment | Discovery, Recommendation, Teaching, Learning Profile | Assessment | Discovery, Recommendation, Learning Profile |
| `knowledge_node_mastery` | Assessment | Assessment | Recommendation, Teaching, Learning Profile | Assessment | Recommendation, Teaching |
| `discovery_session` | Discovery | Discovery | Recommendation, Teaching, Learning Profile | Discovery | Recommendation, Teaching, Learning Profile |
| `self_assessment_mismatch` | Discovery | Discovery | Recommendation, Explainability | Discovery | Recommendation |
| `recommendation_proposal` | Recommendation | Recommendation | Learning Session, Teaching, Mentor Interaction | Recommendation | Learning Session, Teaching |
| `recommendation_proposal_response` | Recommendation | Recommendation | Learning Session, Teaching | Recommendation | Learning Session |
| `learning_session` | Learning Session | Learning Session | Teaching, Recommendation, Mentor Interaction | Learning Session | Recommendation, Teaching, Mentor Interaction |
| `learning_session_transition` | Learning Session | Learning Session | Learning Session analytics/projections, Teaching | Learning Session | Teaching |
| `sub_session` | Learning Session | Learning Session | Mentor Interaction, Teaching | Learning Session | Mentor Interaction |
| `mentor_session` | Mentor Interaction | Mentor Interaction | Evidence, Assessment, Recommendation, Teaching | Mentor Interaction | Evidence, Teaching |
| `decision_header` | Decision Persistence (Supporting) | Decision Persistence | Assessment, Discovery, Recommendation, Teaching, Explainability | Decision Persistence | Assessment, Discovery, Recommendation, Teaching |
| `teaching_decision_detail` | Decision Persistence (Supporting) | Decision Persistence | Teaching, Explainability | Decision Persistence | Teaching |
| `local_expansion_decision_detail` | Decision Persistence (Supporting) | Decision Persistence | Knowledge Graph, Explainability | Decision Persistence | Knowledge Graph |
| `roadmap_mapping_decision_detail` | Decision Persistence (Supporting) | Decision Persistence | Goal & Roadmap, Explainability | Decision Persistence | Goal & Roadmap |
| `stuck_detection_decision_detail` | Decision Persistence (Supporting) | Decision Persistence | Discovery, Teaching, Explainability | Decision Persistence | Discovery, Teaching |
| `intervention_decision_detail` | Decision Persistence (Supporting) | Decision Persistence | Teaching, Recommendation, Explainability | Decision Persistence | Teaching, Recommendation |
| `trace_link` | Explainability (Supporting) | Explainability | Assessment, Discovery, Recommendation, Teaching, Governance/Review | Explainability | Assessment, Discovery, Recommendation, Teaching |

---

## Notes

1. Assessment is the sole write owner of `knowledge_node_mastery`.
2. Evidence writes `evidence`/`evidence_link` only; it does not write mastery tables.
3. Recommendation writes proposal artifacts only (`recommendation_proposal*`), not mastery/session state.
4. Teaching has no canonical domain write-owned aggregate table in current frozen model.
5. Learning Session owns session state and transitions; it acts as coordinator for flow control.
6. Supporting modules (Decision Persistence, Explainability) own internal cross-cutting persistence tables only.
