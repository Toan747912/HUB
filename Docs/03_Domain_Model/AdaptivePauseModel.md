# Adaptive Pause Model Specification

This document defines the rules and indicators for pausing and resuming learning sessions, enforcing the **Adaptive Pause Principle** (DECISION-033).

---

## 1. The Adaptive Pause Principle (DECISION-033)

To avoid frustrating learners, the system rejects hard-coded, silent automatic timeouts or unilateral AI lockouts.
- **The Anti-Pattern:** A background timer silently pauses the session, or the AI unilaterally blocks the user after three failed Socratic turns.
- **The Approved Pattern:** The session remains active until:
  1. The learner manually clicks the pause button.
  2. The AI detects cognitive overload, generates a `RecommendationProposal` suggesting a pause, and the learner explicitly confirms it.

---

## 2. Overload Detection and Recommendation Proposals

The Recommendation Engine evaluates learner telemetry to detect cognitive overload:

### 2.1 Overload Telemetry Signals
The AI compiles signals from the Assessment and Mentor Interaction domains:
- **Consecutive Failures:** $\ge 3$ failed Socratic micro-probes on the active concept.
- **Stuck Telemetry:** Stuck Detection Model flags a Tier 2 intervention without progress.
- **Response Delay:** Prolonged learner input pauses accompanied by repeated vague query loops.

### 2.2 Pause Suggestion Flow
When overload is flagged:
1. The Recommendation Engine generates a `RecommendationProposal`:
   - `proposal_type`: `'pause_session'`
   - `reasoning`: `"Learner hit a Socratic loop on Refresh Token Rotation (3 failed attempts)." `
   - `traced_to[]`: IDs of the failed `AssessmentResult` records.
2. The UI renders a Socratic suggestion to the learner:

> [!TIP]
> *"We've noticed this topic is raising some tricky questions. Would you like to take a quick breather or review the prerequisite JWT basics before trying again?"*

---

## 3. Pause Approval & Resume Rules

### 3.1 Approval Rules
- **AI-Proposed Pause:** Transitions `LearningSession` to `Paused` only after the learner clicks "Confirm Pause". This commits the change and maps the `ApprovalRecord` to the transaction.
- **learner-Initiated Pause:** The learner can click "Pause" directly in the UI header at any time, bypassing recommendation logic and pausing the session immediately.

### 3.2 Resume Behavior
To resume study:
1. The learner clicks "Resume Session" in the dashboard.
2. The system executes a concurrency verification: it pauses any other active session for this learner.
3. The target session state transitions to `Active`, and a new `SubSession` is initialized for the last active roadmap node.
