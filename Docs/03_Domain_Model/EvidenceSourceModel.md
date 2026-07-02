# Evidence Source Model

- **Status:** Draft Design Document (Evidence Domain Design Sprint)
- **Domain Scope:** Evidence Domain
- **Traceability:** DECISION-048, DECISION-052, DECISION-053

---

## 1. Evidence Type Taxonomy

The Evidence Domain supports these evidence types:

1. `Quiz`
2. `Exercise`
3. `Lab`
4. `Project`
5. `Reflection`
6. `PeerReview`
7. `TeachingDemonstration`
8. `MentorInteraction`

---

## 2. Source Weight Baseline Model

To align with DECISION-053 dynamic weighting, each type maps to a baseline `source_weight`:

| Evidence Type | Baseline Source Weight | Reliability Tier | Rationale |
|---|---:|---|---|
| Quiz | 1.00 | High | Structured scoring, bounded scope |
| Exercise | 0.80 | Medium-High | Practical but narrower than project |
| Lab | 0.80 | Medium-High | Hands-on verification with execution signal |
| Project | 1.00 | High | Broad applied synthesis evidence |
| Reflection | 0.50 | Medium | Conceptual articulation quality varies |
| PeerReview | 0.50 | Medium | External but non-authoritative alone |
| TeachingDemonstration | 1.00 | High | Maps to advanced teach capability indicators |
| MentorInteraction | 0.30 | Low-Medium | Conversational, highest noise susceptibility |

**Note:**  
This mapping extends DECISION-053’s baseline categories to sprint-required evidence types while preserving dynamic formula semantics.

---

## 3. Confidence Scaling

`ai_confidence` is assigned in [0.0, 1.0] after verification checks.

Suggested operational interpretation:
- `0.00 - 0.24`: insufficient reliability
- `0.25 - 0.49`: weak evidence
- `0.50 - 0.74`: moderate evidence
- `0.75 - 0.89`: strong evidence
- `0.90 - 1.00`: very strong evidence

Derived weight:
- `evidence_weight = source_weight * ai_confidence`

---

## 4. Explainability Requirements Per Source

Every evidence type must carry:
1. `confidence`
2. `reasoning`
3. `traced_to[]`

Additional per-type minimum trace fields:

| Evidence Type | Minimum `traced_to[]` Requirements |
|---|---|
| Quiz | quiz_attempt_id, question_ids[] |
| Exercise | exercise_attempt_id, test_case_refs[] |
| Lab | lab_run_id, execution_log_ref |
| Project | submission_id, rubric_item_refs[] |
| Reflection | reflection_entry_id, prompt_ref |
| PeerReview | peer_review_id, reviewer_refs[] |
| TeachingDemonstration | demo_session_id, rubric_refs[] |
| MentorInteraction | mentor_session_id, turn_ids[] |

No evidence may become `Verified` without satisfiable trace references.

---

## 5. Mapping to Teach Composite (DECISION-052)

Evidence types can map to Teach sub-capability evidence channels:

| Teach Sub-Capability | Strongest Evidence Types |
|---|---|
| Explain | Reflection, MentorInteraction, Quiz |
| Simplify | TeachingDemonstration, MentorInteraction |
| Guide | TeachingDemonstration, Lab |
| Review | PeerReview, TeachingDemonstration |
| Transfer Knowledge | Project, Lab, TeachingDemonstration |

This model supports downstream Assessment calculations but does not assign mastery decisions inside Evidence Domain.

---

## 6. Source Model Invariants

1. Each evidence record has exactly one primary evidence type.
2. Baseline `source_weight` must be deterministic from type (unless governed override policy is explicitly approved).
3. Any override of default source weight must be reasoned, traced, and audited.
4. `MentorInteraction` evidence cannot solely trigger operational demotion decisions; it contributes weighted signal only.
5. Source metadata must include owner-domain reference to preserve accountability.

---

## 7. Ownership Reminder

Evidence source modeling is metadata ownership only.  
It must not:
- mutate mastery
- execute regression demotion
- create recommendation proposals
- alter roadmap state
