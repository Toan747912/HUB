# DECISION-053 — Evidence Weighting and Knowledge Regression

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-06-30
- **Context:** Resolving Open Question 13 (OQ13) regarding the mathematical model for evidence weight calculations and dynamic thresholds for triggering Knowledge Regression.

---

## Context

To trigger Knowledge Regression (downgrading a learner's masteries due to negative performance), the system requires a deterministic way to aggregate evidence. Counting the number of failed attempts is insufficient (DECISION-021), and relying on fixed values makes the system highly susceptible to noise (e.g., typos in chat inputs). A dynamic model is required.

---

## Decision

We adopt the **Progressive / Dynamic Model (Model B)** from the [Weighting Models](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/WeightingModels.md) design document:

1. **Dynamic Weight Formula:**
   $$evidence\_weight = SourceWeight \times AI\_Confidence$$
   Where:
   - **SourceWeight (Fixed Baseline):** Represents the default weight of the assessment format:
     - Project/Test = `1.0`
     - Practice/Lab = `0.8`
     - Probe Question = `0.5`
     - Chat Observation = `0.3`
   - **AI_Confidence (Dynamic [0.0 - 1.0]):** Evaluated by the AI service during the grading process, reflecting the certainty and quality of the response.
2. **Regression Threshold:**
   Knowledge Regression is triggered for a node if the cumulative weight of negative evidence reaches or exceeds **`1.5`**:
   $$\sum evidence\_weight_{negative} \ge 1.5$$
3. **Evidence Expiration:**
   Consistent with DECISION-016, evidence does not decay over time. Accumulations are cleared or overridden only by new positive evidence (successful assessments) on the same node.

---

## Consequences

- **Noise Filtering:** Conversational errors or ambiguous responses are assigned a low `AI_Confidence` value (e.g. 0.2), reducing their negative weight (e.g., $0.3 \times 0.2 = 0.06$) so they do not trigger premature regressions.
- **Database Schema:** Tables storing assessment results and evidence metrics must include separate columns for `source_weight` and `ai_confidence` to support dynamic aggregation queries in SQL.
- **Explainability:** Simplifies audits as users can see exactly which failed assessments (and with what AI confidence weights) summed up to trigger the regression.

---

## Related Documents
- [WeightingModels.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/WeightingModels.md)
- [DECISION-016-Evidence-Based-Decay.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-016-Evidence-Based-Decay.md)
- [DECISION-021-Evidence-Weighting.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-021-Evidence-Weighting.md)
- [OpenQuestions.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/01_PRD/OpenQuestions.md)
