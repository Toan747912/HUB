# DECISION-051 — Self-Assessment Mismatch Mechanism

- **Status:** ✅ **Accepted (Locked).**
- **Date:** 2026-06-30
- **Context:** Resolving Open Question 5 (OQ5) regarding the detection threshold, verification strategy, and control boundaries when a learner's self-reported capability level conflicts with their observed performance during a discovery session.

---

## Context

When a learner onboard or enters a continuous discovery session, they declare their competence level (`self_reported_level`) for specific skill areas. The Discovery Engine observes actual performance (`observed_level`) using micro-probes. If a conflict occurs, a mechanism is needed to log this difference, adapt within the session, and notify recommendation systems without causing negative user friction or violating explainability rules (DECISION-048).

---

## Decision

We adopt **Option B (Balanced)** from the [OQ5 Alternatives](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/OQ5_Alternatives.md) design artifact:

1. **Activation Threshold:**
   - **$\ge 2$ levels gap:** A mismatch entity (`SelfAssessmentMismatch`) is created immediately.
   - **$1$ level gap:** A second verification probe is generated. If the second probe confirms the discrepancy, the mismatch is created. If not, the gap is recorded under a standard `CompetencySignal` for telemetry, but no formal mismatch is registered.
2. **Mismatch Directions:**
   - **Overclaim (Self > Observed):** Created as `active` mismatch, signalling the Recommendation Engine to propose lower-difficulty content.
   - **Underclaim (Self < Observed):** Created as `passive` mismatch (log-only), allowing eventual acceleration proposals without intrusive overrides.
3. **AI Control Boundary:**
   - **In-Session:** AI automatically adapts question difficulty dynamically.
   - **Cross-Domain:** AI *cannot* mutate the learner's Roadmap directly. Mismatch alerts are passed to the Recommendation Engine, which displays recommendations for the learner to accept or reject.
4. **User Contestation:**
   - Learners are presented with the mismatch reasoning (`reasoning`) at the end of the session.
   - Learners can challenge the finding, triggering a `mismatch-contest` follow-up probe (processed as a new `CompetencySignal`).

---

## Consequences

- **Session Orchestration:** The orchestrator must handle dynamic branching to serve a second verification probe when a 1-level gap is first detected.
- **Explainability:** Mismatch records must contain unique `traced_to` arrays referencing the exact answers/probes that justified the mismatch.
- **Audit Trails:** Mismatches cannot be edited or deleted once written; revisions must be registered as new audit entries.

---

## Related Documents
- [SelfAssessmentMismatchMechanism.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/SelfAssessmentMismatchMechanism.md)
- [OQ5_Alternatives.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/03_Domain_Model/OQ5_Alternatives.md)
- [OpenQuestions.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/01_PRD/OpenQuestions.md)
- [DECISION-048-All-AI-Decisions-Must-Be-Explainable.md](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Docs/11_Decisions/DECISION-048-All-AI-Decisions-Must-Be-Explainable.md)
