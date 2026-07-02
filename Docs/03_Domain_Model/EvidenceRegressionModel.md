# Evidence Regression Signal Model

- **Status:** Draft Design Document (Evidence Domain Design Sprint)
- **Domain Scope:** Evidence Domain (signal generation), Assessment Domain (regression decision)
- **Traceability:** DECISION-053 (primary), DECISION-026, DECISION-048

---

## 1. Purpose

This document defines how Evidence Domain models **negative evidence** and emits **regression trigger signals** without violating ownership boundaries.

Evidence Domain does:
- detect weighted negative accumulation
- emit explainable threshold signals

Evidence Domain does not:
- demote mastery levels
- write regression outcomes

---

## 2. Negative Evidence Definition

Negative evidence is any verified evidence indicating mismatch, misunderstanding, failed application, or incorrect teaching demonstration relative to expected capability.

Required fields:
- `direction = negative`
- `source_weight`
- `ai_confidence`
- `evidence_weight`
- `reasoning`
- `traced_to[]`
- learner/node references

---

## 3. Regression Trigger Logic (Signal-Only)

Per DECISION-053, threshold reference:

\[
\sum evidence\_weight_{negative} \ge 1.5
\]

Signal generation rules:
1. aggregate only `Verified` and non-superseded negative evidence
2. aggregate per learner × knowledge_node scope
3. exclude archived evidence from active operational aggregation (still auditable)
4. when threshold crossed, emit `EvidenceNegativeThresholdReached`

---

## 4. Trigger Event Contract (Conceptual)

`EvidenceNegativeThresholdReached` payload:
- learner_id
- knowledge_node_id
- cumulative_negative_weight
- contributing_evidence_ids[]
- evaluated_at
- reasoning_summary
- traced_to[]

Consumer:
- Assessment Domain (sole decision owner)

---

## 5. Additional Signal Types

- `EvidenceNegativeTrendIncreasing`
- `EvidenceNegativeWeightAccumulated`
- `EvidenceCounterEvidenceDetected` (positive evidence after negative streak)

These are advisory inputs for Assessment cadence tuning and recommendation context, not direct decisions.

---

## 6. Anti-Noise Rules

To reduce false triggers:
1. low-confidence conversational signals naturally down-weighted by formula
2. superseded erroneous evidence excluded from active aggregation
3. mixed evidence must be split before directional totals
4. missing traceability evidence cannot contribute to threshold signals

---

## 7. Explainability Requirements

Every trigger signal must carry:
- confidence context (from component evidence)
- reasoning_summary
- traced_to chain to underlying artifacts

If explainability envelope is incomplete, signal must be marked non-actionable for downstream automation.

---

## 8. Boundary Compliance

Explicitly forbidden in Evidence Regression Signal Model:
- issuing `KnowledgeRegressionDetected` as a final domain decision
- mutating `knowledge_node_mastery`
- changing roadmap/session status directly
- writing recommendation proposals directly
