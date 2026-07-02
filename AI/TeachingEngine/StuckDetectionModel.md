# Stuck Detection and Intervention Model Specification

To adhere to Core Principle 6 ("Do not let the user be stuck for too long") without violating Core Principle 1 ("No rote learning"), the Teaching Engine implements a structured **Stuck Detection (D9a)** and **Intervention Tier Selection (D9b)** model.

---

## 1. Stuck Detection Criteria & Signals (D9a)

Stuck detection is triggered when the learner exhibits signs of cognitive bế tắc (impasse). Telemetry and NLP signals are fed into the Teaching Engine every interaction turn:

```
                  ┌───────────────────────────────┐
                  │ Learner Action / Conversation │
                  └───────────────┬───────────────
                                  │
      ┌───────────────────────────┼───────────────────────────┐
      ▼                           ▼                           ▼
[1. Failures]              [2. Idle Time]             [3. Conversational]
Consecutive incorrect      Time elapsed without       Learner repeating
code runs or test          constructive progress      semantic questions or
failures on node (>= 3).   in active session.         expressing frustration.
      └───────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
                    Stuck Telemetry Aggregated
                                  │
                                  ▼
                     Stuck Detected (D9a Logged)
```

### 1.1 Detection Signals and Thresholds
1. **Consecutive Failures:**
   - **Threshold:** $\ge 3$ consecutive failing compiler/test runs, or $\ge 3$ consecutive incorrect answers to Socratic verification probes on the same `KnowledgeNode`.
2. **Session Idle Time (Telemetry):**
   - **Threshold:** Learner is active in a session but makes no constructive keystrokes, attempts, or chat inputs for $\ge 5$ minutes on the same step.
3. **Conversational Semantic Loop Count:**
   - **Threshold:** The learner asks the same semantic question $\ge 3$ times within a single `SubSession` (e.g., repeating "Why is signature invalid?" in different ways) indicating Socratic explanation failure.
4. **Direct Help Requests:**
   - **Threshold:** Learner explicitly writes keywords like "I am stuck", "give me the code", "I don't know", or "help me".

---

## 2. Telemetry Payload Schema

The D9a decision persists the raw signals using the `signal_payload` JSONB column in `stuck_detection_decision_detail`. The schema must conform to the following JSON structure:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "StuckDetectionSignalPayload",
  "type": "object",
  "properties": {
    "consecutive_failures": {
      "type": "integer",
      "minimum": 0
    },
    "idle_seconds": {
      "type": "integer",
      "minimum": 0
    },
    "loop_count": {
      "type": "integer",
      "minimum": 0
    },
    "direct_help_requested": {
      "type": "boolean"
    },
    "nlp_sentiment": {
      "type": "string",
      "enum": ["neutral", "confused", "frustrated"]
    }
  },
  "required": ["consecutive_failures", "idle_seconds", "loop_count", "direct_help_requested"]
}
```

---

## 3. The Intervention Ladder (D9b)

Once a stuck state is registered, the Teaching Engine transitions from standard Socratic guidance to the **Intervention Ladder**. The engine selects the lowest tier necessary to resolve the impasse, balancing help against the risk of cognitive passivity.

| Tier | Intervention Action | Risk Profile | Guidance Rule |
|---|---|---|---|
| **Tier 1: Hint** | Provides a conceptual clue, links to documentation, or isolates the logical error. | **Low Risk:** Learner still does the cognitive work. | Highlight the line of code containing the error, explaining *what* is wrong but not *how* to fix it. |
| **Tier 2: Guided Walkthrough** | Breaks down the single difficult task into $N$ micro-steps, asking the student to solve step 1 first. | **Medium Risk:** Reduces task complexity but keeps learner engaged. | Decompose the logic. For example: "1. Parse the Header. 2. Verify the Signature. Let's start with parsing. Show me how you write the parse step." |
| **Tier 3: Direct Fix** | Provides the exact code solution, refactored snippet, or direct answer. | **High Risk:** High threat of rote copy-pasting. Can cause dependency. | **Strict Limit:** Only select Tier 3 if Tier 1 and 2 have failed, or if the learner is highly frustrated. MUST explain the code step-by-step and force a verification probe immediately afterward. |

---

## 4. Intervention Governance & Safety Bounds

To prevent AI from defaulting to Direct Fix (violating Core Principle 1), the following constraints are enforced:

### 4.1 Tier Selection Constraints
- **Tier Escalation Rule:** The AI **MUST** select Tier 1 (Hint) first. Tier 3 (Direct Fix) is blocked unless:
  - There has been at least 1 Tier 1 and 1 Tier 2 intervention attempt recorded in the active `SubSession` that failed to resolve the stuck state.
  - OR the learner explicitly requested direct code and NLP analysis reports extreme frustration.
- **Explainability Validation:** The logging of `intervention_decision_detail` (D9b) must include a detailed `intervention_reasoning` explaining why a lower-tier intervention was skipped or was insufficient.

### 4.2 Post-Direct-Fix Verification Protocol
If a **Direct Fix (Tier 3)** is applied:
1. The AI provides the correct code/answer.
2. The active Socratic capability shifts immediately to **Explain + Verify** mode.
3. The AI **MUST** issue a verification prompt (probe) on a modified variant of the problem in the next turn (e.g., "Now that we fixed this Express JWT error, how would you write the equivalent verification if the secret key was loaded asynchronously?").
4. Mastery updates for this node are throttled: the learner cannot achieve mastery of the node in the current session unless they pass this post-fix verification probe successfully.
