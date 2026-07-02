# Evidence Prompt Architecture

- **Status:** Draft Design Document (Evidence Domain Design Sprint)
- **Domain Scope:** Prompt Architecture for Evidence workflows
- **Traceability:** DECISION-048, DECISION-053, DECISION-026 boundaries

---

## 1. Prompt Families

1. Evidence Extraction Prompt
2. Evidence Verification Prompt
3. Evidence Scoring Prompt

All prompt outputs must be machine-parseable and explainability-complete.

---

## 2. Evidence Extraction Prompt

## 2.1 Purpose
Transform raw artifacts (chat turns, submissions, lab logs, peer feedback) into structured candidate evidence.

## 2.2 Input Contract
```json
{
  "learner_id": "uuid",
  "knowledge_node_id": "uuid",
  "evidence_type": "MentorInteraction",
  "raw_artifacts": [],
  "context": {
    "session_id": "uuid",
    "goal_id": "uuid"
  }
}
```

## 2.3 Output Contract
```json
{
  "candidate_evidence": {
    "direction": "negative",
    "normalized_payload": {},
    "traced_to": ["mentor_turn:uuid"],
    "reasoning": "Learner repeatedly confuses async and parallelism terminology."
  },
  "confidence": 0.62
}
```

Validation:
- `direction` required
- `reasoning` required
- `traced_to[]` required
- `confidence` in [0,1]

---

## 3. Evidence Verification Prompt

## 3.1 Purpose
Determine whether candidate evidence satisfies verification quality and explainability thresholds.

## 3.2 Input Contract
```json
{
  "evidence_id": "uuid",
  "evidence_type": "Lab",
  "normalized_payload": {},
  "traced_to": ["lab_run:uuid", "log_ref:uuid"],
  "policy": {
    "require_explainability": true,
    "require_trace_resolution": true
  }
}
```

## 3.3 Output Contract
```json
{
  "is_verifiable": true,
  "confidence": 0.78,
  "reasoning": "Execution output confirms failure in edge-case branch under expected constraints.",
  "traced_to": ["lab_run:uuid", "test_case:edge-timeout"],
  "verification_flags": []
}
```

Failure sample:
```json
{
  "is_verifiable": false,
  "confidence": 0.31,
  "reasoning": "Artifact set incomplete; cannot validate claim.",
  "traced_to": [],
  "verification_flags": ["MISSING_TRACE"]
}
```

---

## 4. Evidence Scoring Prompt

## 4.1 Purpose
Compute weighting fields aligned to DECISION-053.

## 4.2 Input Contract
```json
{
  "evidence_id": "uuid",
  "evidence_type": "Project",
  "source_weight": 1.0,
  "confidence": 0.86,
  "direction": "positive",
  "reasoning": "Project demonstrates independent transfer and integration of prerequisite concepts.",
  "traced_to": ["submission:uuid", "rubric:item-4"]
}
```

## 4.3 Output Contract
```json
{
  "source_weight": 1.0,
  "ai_confidence": 0.86,
  "evidence_weight": 0.86,
  "direction": "positive",
  "confidence": 0.86,
  "reasoning": "High confidence due to complete rubric coverage and successful integration tests.",
  "traced_to": ["submission:uuid", "rubric:item-4"]
}
```

Invariant:
- `evidence_weight = source_weight * ai_confidence`

---

## 5. Global Prompt Output Rules

Every prompt output must include:
- `confidence`
- `reasoning`
- `traced_to[]`

Any missing field invalidates the output for verification/finalization.

---

## 6. Safety and Boundary Guardrails

Prompt system must reject or tag outputs that:
- attempt mastery level update decisions
- attempt regression final decisions
- attempt recommendation creation decisions
- attempt roadmap mutation decisions

Such actions are outside Evidence ownership and must be delegated.

---

## 7. Auditability Requirements

Prompt execution logs must preserve:
- prompt template version
- input contract checksum
- output payload checksum
- timestamp
- actor/service id
- correlation id

This enables replay and explainability audits.
