# DECISION-052 — Teach Capability Composite Weighting

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-06-30
- **Context:** Resolving Open Question 12 (OQ12) regarding the weighting model for composite mastery evaluation of the Teach capability and its sub-capabilities.

---

## Context

Under the Mastery Framework, achieving the "Teach" level on a capability represents complete mastery. "Teach" is composed of 5 distinct sub-capabilities (Explain, Simplify, Guide, Review, and Transfer Knowledge). A model is needed to weigh these sub-capabilities and produce a composite score, rather than relying on a binary pass/fail assessment.

---

## Decision

We adopt the **Progressive Weight Model (Model B)** from the [Weighting Models](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/WeightingModels.md) design document:

1. **Weights Distribution:** The weights scale progressively based on Bloom's Taxonomy, assigning higher values to advanced cognitive skills (guiding, reviewing, and transferring):
   - **Explain:** `0.10` (10%)
   - **Simplify:** `0.15` (15%)
   - **Guide:** `0.25` (25%)
   - **Review:** `0.25` (25%)
   - **Transfer Knowledge:** `0.25` (25%)
2. **Formula:**
   $$Score_{Teach} = 0.10 \times S_{Explain} + 0.15 \times S_{Simplify} + 0.25 \times (S_{Guide} + S_{Review} + S_{Transfer})$$
   Where $S_{sub\_cap} \in \{0, 1\}$ represents the learner's assessment score on the respective sub-capability.
3. **Mastery Threshold:** A learner is determined to have mastered the Teach capability if the composite score is **$\ge 75\%$** (which requires passing all three advanced capabilities, or a combination of basic and advanced capabilities totaling at least 0.75).

---

## Consequences

- **Sub-Capability Tracking:** The database schema must store individual evaluated states for all 5 sub-capabilities of Teach for any node.
- **AI Assessment Complexity:** The AI evaluator must structure questions and analyze responses specifically targeting these 5 areas.
- **Explainability:** Evaluation outputs can be broken down mathematically to explain why mastery was or was not reached (conforming to DECISION-020 and DECISION-048).

---

## Related Documents
- [WeightingModels.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/WeightingModels.md)
- [DECISION-017-Mastery-Framework.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-017-Mastery-Framework.md)
- [DECISION-020-Teach-Composite-Capability.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-020-Teach-Composite-Capability.md)
- [OpenQuestions.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/01_PRD/OpenQuestions.md)
