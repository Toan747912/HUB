# Evidence Weighting Model

- **Status:** Draft Design Document (Evidence Domain Design Sprint)
- **Domain Scope:** Evidence Domain (weight generation), Assessment Domain (decision consumer)
- **Traceability:** DECISION-053 (primary), DECISION-026, DECISION-048

---

## 1. Decision Alignment

This model is strictly aligned with DECISION-053:

\[
evidence\_weight = source\_weight \times ai\_confidence
\]

Where:
- `source_weight` = fixed baseline from evidence source type
- `ai_confidence` = dynamic certainty score in [0,1]

---

## 2. Inputs

## 2.1 Source Weight (`source_weight`)
Derived from EvidenceSourceModel baseline mapping.

## 2.2 AI Confidence (`ai_confidence`)
Computed during verification workflow.

Range:
- min 0.0
- max 1.0

## 2.3 Direction
Evidence direction classification:
- `positive`
- `negative`
- `mixed` (must decompose into directional components before cumulative calculations)

---

## 3. Output Fields

For each verified evidence record:

- `source_weight`
- `ai_confidence`
- `evidence_weight`
- `direction`
- `reasoning`
- `traced_to[]`

---

## 4. Cumulative Impact Semantics

Evidence Domain calculates and emits cumulative signal summaries per learner-node:

- `cumulative_positive_weight`
- `cumulative_negative_weight`
- `net_weight_signal = cumulative_positive_weight - cumulative_negative_weight`

**Important ownership rule:**  
These cumulative metrics are **informational signals** only.  
Assessment Domain consumes them to decide mastery/regression outcomes.

---

## 5. Regression Threshold Reference (DECISION-053)

DECISION-053 defines:

\[
\sum evidence\_weight_{negative} \ge 1.5
\]

Evidence Domain responsibilities:
- compute/store per-evidence weights
- aggregate negative cumulative weights
- emit threshold-crossing signal event

Evidence Domain must **not** execute demotion action.

---

## 6. Formula Invariants

1. `evidence_weight` must equal exact product of source weight and confidence (subject to controlled precision/rounding).
2. `ai_confidence` out of range invalidates verification.
3. `source_weight <= 0` invalidates verification.
4. Directionless evidence cannot be used in cumulative directional aggregation.
5. Any manual override must be reasoned and audited.

---

## 7. Explainability Requirements

Each weighted evidence must be explainable with:
- why this source baseline was selected
- why this confidence was assigned
- which artifacts supported confidence estimate (`traced_to[]`)

Weight without explainability is non-compliant with DECISION-048.

---

## 8. Non-Ownership Guardrails

Evidence weighting model must not:
- alter mastery state
- finalize regression action
- generate recommendation proposals
- mutate roadmap structure
