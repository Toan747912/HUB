# Learning Session Prompt Architecture Specification

This document defines the prompting strategies, system instructions, and structured JSON envelopes used by the AI engines to orchestrate, analyze, and pause learning sessions within the **AI Mentor OS**.

---

## 1. Context Assembly & Session Orchestration Prompt

Builds the dynamic conversational prompt context for the Socratic Teaching Engine by loading the active goal, active sub-session, and current progress metrics.

### 1.1 Prompt Template
```
Role: Orchestrator AI.
Task: Assemble the conversational context for the active Socratic SubSession.

Context Variables:
- Active Goal: {active_goal}
- Active Roadmap Node: {active_node}
- Active Knowledge Nodes: {active_concepts}
- Current Progress Snapshot: {progress_snapshot}
- Telemetry Logs: {recent_turns}

Instruction:
Generate a unified context payload. Ensure it accurately identifies the boundaries of what is in-scope vs out-of-scope for the active sub-session.
```

### 1.2 Output JSON Envelope
```json
{
  "active_context": {
    "goal": "Build React app with JWT rotation.",
    "roadmap_node": "JWT Auth Setup",
    "concepts": ["jwt_structure", "access_token_storage"],
    "progress": "25.00%"
  },
  "explainability": {
    "confidence": 0.98,
    "reasoning": "Assembled active sub-session context from goal, roadmap, and knowledge node definitions. Identified 'access_token_storage' as the immediate conversational concept.",
    "traced_to": [
      "goal:c03f56a3-2287-41ab-85cf-252199b50e39",
      "roadmap_node:n01f56a3-2287-41ab-85cf-252199b50e02"
    ]
  }
}
```

---

## 2. Pause Recommendation Prompt

Evaluates telemetry loops and errors to propose pausing the session (Adaptive Pause, DECISION-033).

### 2.1 Prompt Template
```
Role: Cognitive Load Auditor AI.
Task: Analyze active telemetry and determine if the user is struggling with concept retention.

Rules:
1. If you detect overload (e.g. repeated loop errors), output a recommendation proposal to pause.
2. Do not automatically enforce the pause. Output a proposal payload.
```

### 2.2 Output JSON Envelope
```json
{
  "recommend_pause": true,
  "proposal_type": "pause_session",
  "reasoning_explanation": "We noticed you've had a few attempts on token rotation claims. Taking a break or reviewing the basic JWT signature structure first might help clarify these security concepts. Would you like to pause the active session?",
  "explainability": {
    "confidence": 0.92,
    "reasoning": "Flagged cognitive overload based on three consecutive failed Socratic micro-probes on 'jwt_rotation'. Proposing adaptive pause.",
    "traced_to": [
      "assessment_result:ar03f56-2287-41ab-85cf-252199b50e80",
      "assessment_result:ar03f56-2287-41ab-85cf-252199b50e81",
      "assessment_result:ar03f56-2287-41ab-85cf-252199b50e82"
    ]
  }
}
```
