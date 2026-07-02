# Teaching Outcome Model Specification

This document defines how the outcomes of teaching interactions feed the **Assessment** and **Knowledge** domains, forming a closed-loop personalized learning system.

---

## 1. The Closed-Loop Architecture

The Teaching Engine creates a continuous loop where instructional delivery produces interactive responses (evidence), which are evaluated to adjust mastery levels, which in turn drive recommendation proposals that the Teaching Engine executes:

```
    ┌────────────────────────────────────────────────────────┐
    │                                                        │
    ▼                                                        │
[1. Teaching Engine] ➔ [2. Evidence Domain]             [5. Recommendation]
Executes approved      Learner inputs saved as            Synthesizes mastery &
proposals (D1, D9b).    Evidence & links (DECISION-053).   regression into proposals.
    ▲                                                        ▲
    │                                                        │
    └───────────────── [3. Assessment Domain] ───────────────┘
                       Evaluates evidence to write
                       Mastery & AssessmentResult (D2).
```

---

## 2. Feeding the Assessment Domain: Evidence and Mastery Updates

Every Socratic turn or task completion produces data that must be structured and fed to the Assessment Domain.

### 2.1 Evidence Generation and Weighting (DECISION-053)
When a learner responds to Socratic questions, submits code, or completes an exercise, the Teaching Engine packages the submission and registers it via the **Evidence Management** capability.

- **Baseline Source Weights ($SourceWeight$):**
  - **Chat Interaction:** `0.3` (Casual conversation, unstructured Q&A).
  - **Socratic Probe:** `0.5` (Targeted verification question during Guide/Review phases).
  - **Lab Exercise:** `0.8` (Active coding in a local environment).
  - **Automated Test:** `1.0` (Unit tests passing on a coding challenge).
- **AI Confidence ($AI\_Confidence$):** Extracted dynamically by the Teaching Engine (ranging from `0.0` to `1.0`) during the prompt interaction, indicating the AI's confidence in the accuracy of the learner's response.
- **Evidence Weight Formula:**
  $$evidence\_weight = SourceWeight \times AI\_Confidence$$
- **Stance Mapping:** Each `evidence_link` is marked with a direction:
  - `support`: The evidence confirms understanding (adds positive evidence).
  - `refute`: The evidence demonstrates a misconception or incorrect answer (adds negative evidence).

### 2.2 Knowledge Regression Trigger (DECISION-053)
The Assessment Engine aggregates negative evidence weights over time. 
- **Regression Threshold:** If the sum of active negative evidence weights for a specific `KnowledgeNode` reaches **$\ge 1.5$**, the system triggers a **Knowledge Regression Detected** event.
- **Teaching Engine Feedback:** The Teaching Engine listens to this event. When a regression is detected, the engine halts forward progress on the active roadmap branch and switches the sub-session context to remediation mode (invoking Explain/Simplify on the regressed node).

---

## 3. Feeding the Knowledge Domain: Knowledge Node Expansion

When a learner's questions or interests exceed the current static boundary of the active `KnowledgeNode`, the Teaching Engine triggers an expansion of the Knowledge Graph.

```
       Learner asks follow-up query outside active node boundaries
                                    │
                                    ▼
                 Evaluate Controlled Expansion Criteria
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼ (Local Expansion)                                   ▼ (Deep Expansion)
   AI adds local edge & node                             AI adds structural node
   without warning Learner.                              & displays reason to Learner.
         │                                                     │
         ▼                                                     ▼
 Ghi local_expansion_decision_detail                      Ghi expansion_record
     (D5 Explainability Log)                            (D4 Explainability Log)
```

### 3.1 Controlled Expansion Triggers (DECISION-023)
- **Local Expansion (D5):** If the learner asks a question requiring auxiliary context (e.g., asking about token security practices while learning access token verification), the Teaching Engine triggers a local expansion. This creates a `local_expansion_decision_detail` log (D5, internal reason log) and inserts a local `KnowledgeNode` and `KnowledgeEdge` into the graph.
- **Deep/Structural Expansion (D4):** If the extension impacts the overall learning pathway (e.g. adding a new prerequisite framework), the engine triggers a Deep Expansion. This inserts the node and logs an `expansion_record` (D4, learner-facing explanation).

---

## 4. Traceability Integration (DECISION-038)

To support the Explainability First principle, the Teaching Engine links all outcomes to their origins using the centralized `trace_link` model:

- When an **Evidence** is created, it writes a `trace_link` pointing to the `teaching_decision_detail` (D1) or `intervention_decision_detail` (D9b) that prompted the learner's action.
- When an **AssessmentResult** is generated, it writes a `trace_link` pointing back to the specific `evidence` and `evidence_link` that was evaluated.
- This ensures that a complete diagnostic trail can be traversed from a learner's current Mastery level, back to the Assessment results, the Evidence submitted, and the specific Teaching or Socratic prompt that initiated the loop.
