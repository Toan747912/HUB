# Evidence Explainability Model

- **Status:** Draft Design Document (Evidence Domain Design Sprint)
- **Domain Scope:** Evidence Domain (provenance/explainability chain authority)
- **Traceability:** DECISION-048 (primary), DECISION-030, DECISION-053

---

## 1. Explainability Objective

Evidence is the provenance foundation for explainable AI decisions across Assessment, Recommendation, and Teaching pipelines.

Every verified evidence item must support answering:
- What artifact was used?
- Why was this evidence accepted?
- How confident was the verifier?
- Which downstream decision consumed it?

---

## 2. `traced_to` Propagation Model

## 2.1 Source-level tracing
At evidence creation, `traced_to[]` references source artifacts such as:
- quiz attempt ids
- lab execution logs
- project submissions
- mentor turn ids
- peer review records

## 2.2 Verification-level tracing
Verification appends trace links for:
- normalization transforms
- scoring rubric references
- verification decision records

## 2.3 Downstream propagation
When Assessment/Recommendation consumes evidence, it should include evidence ids and inherited trace chain references in their own explainability envelopes.

---

## 3. Reasoning Propagation Model

Evidence reasoning must be propagated in layers:

1. **Capture reasoning**
   - why this interaction constitutes candidate evidence
2. **Verification reasoning**
   - why evidence is considered valid and with what confidence
3. **Signal reasoning**
   - why cumulative weighted signals were emitted
4. **Consumer decision reasoning** (outside Evidence ownership)
   - assessment/recommendation rationale referencing evidence reasoning

This preserves end-to-end explainability chain continuity.

---

## 4. Audit Trail Requirements

Every explainability-relevant mutation/event must be auditable with:
- actor identity (system/human)
- timestamp
- action type
- before/after lifecycle state (where relevant)
- confidence
- reasoning
- trace links

Minimum auditable events:
- evidence collected
- verification requested/completed/failed
- challenge submitted/resolved
- superseded
- archived

---

## 5. Explainability Invariants

1. Verified evidence requires non-empty `reasoning`.
2. Verified evidence requires non-empty `traced_to[]`.
3. Trace links must resolve to valid artifact identifiers at verification time.
4. Superseded evidence must keep its original trace chain immutable.
5. Archived evidence remains retrievable for audit explainability.
6. Any downstream signal event without explainability envelope must be flagged non-compliant.

---

## 6. Explainability Envelope (Canonical Shape)

```json
{
  "confidence": 0.84,
  "reasoning": "Learner solved boundary and error-handling branches correctly with minor hinting.",
  "traced_to": [
    "lab_run:1f82...",
    "test_case:timeout-retry",
    "mentor_turn:8842..."
  ]
}
```

---

## 7. Compliance Notes

- DECISION-048 requires explainability for all AI decisions.
- Evidence Domain is responsible for preserving high-fidelity trace and reasoning inputs consumed by decision domains.
- This document does not redefine decision ownership; Assessment remains decision owner for mastery/regression outcomes.
