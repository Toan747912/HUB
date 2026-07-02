# Goal Prompt Architecture Specification

This document defines the prompting strategies, system guidelines, and structured JSON envelopes used by the AI Engines (specifically the **Discovery Engine** and **Roadmap Engine**) to create, clarify, refine, and supersede learner goals.

---

## 1. Goal Creation Prompt

Converts unstructured, natural-language learner inputs into a clean, actionable Goal statement during the onboarding discovery phase.

### 1.1 Prompt Template
```
Role: Goal Definition Assistant.
Task: Parse the learner's unstructured request and extract a single, clear, professional learning Goal statement.

Pedagogical Rules:
- The statement should describe a concrete, project-based, or job-related outcome (e.g., "Build a REST API...", "Develop a React app...").
- Do not make the goal statement generic (e.g., avoid "Learn Python"). If it is generic, isolate the specific skill sub-areas.

JSON Schema Output Requirement:
You must respond with a JSON object matching the output schema.
```

### 1.2 Input and Output Contracts
- **Input Context:** Raw natural language string (e.g., *"I want to make a website that lets people upload videos and watch them, and I think I need React and Node."*)
- **Output JSON Envelope:**
```json
{
  "extracted_statement": "Build a full-stack video hosting and streaming website using React and Node.js.",
  "claimed_skill_areas": [
    "Frontend Development with React",
    "Backend API Development with Node.js",
    "Video File Handling"
  ],
  "explainability": {
    "confidence": 0.95,
    "reasoning": "Extracted concrete project-based objective 'Build a full-stack video hosting website...' from loose learner statement. Mapped React and Node.js directly to claimed skill areas.",
    "traced_to": [
      "learner_input:onboarding_raw_request"
    ]
  }
}
```

---

## 2. Goal Clarification Prompt

Used Socratic-style when the learner's initial statement is too vague (e.g., *"I want to learn programming"*), prompting them to narrow down the target.

### 2.1 Prompt Template
```
Role: Socratic Career Advisor.
Task: Help the learner clarify their vague learning statement. Instead of assigning a generic goal, ask one targeted Socratic question that helps them choose a specific track (Frontend, Backend, Mobile, Data Engineering).

Clarification Rules:
- Never lecture or offer answers.
- Ask one brief question presenting clear, relatable alternatives.
```

### 2.2 Input and Output Contracts
- **Input Context:** Vague statement (e.g., *"I want to learn web development."*)
- **Output JSON Envelope:**
```json
{
  "prompt_text": "Web development has two main paths: building what the user sees (Frontend, using React/HTML) or handling the server, data, and security behind the scenes (Backend, using Node/Python). Which of these areas sounds more interesting to start with?",
  "needs_clarification": true,
  "explainability": {
    "confidence": 0.90,
    "reasoning": "Statement 'learn web development' is too broad for roadmap generation. Prompting Socratic choice between Frontend and Backend to narrow scope.",
    "traced_to": [
      "learner_input:vague_onboarding_request"
    ]
  }
}
```

---

## 3. Goal Refinement & Superseding Prompt

Triggered when the Recommendation Engine suggests expanding or narrowing the active goal (e.g. adding password hashing or token rotation), requiring the user to approve a version change.

### 3.1 Prompt Template
```
Role: Technical Architect Mentor.
Task: Present a refined version of the learner's goal, explaining why the changes are recommended (e.g., adding security best practices or prerequisites).

Versioning Rules:
- Highlight what was added or removed.
- State why this revision prevents future roadblocks.
- Prompt the learner to accept or decline the change.
```

### 3.2 Input and Output Contracts
- **Input Context:** Active goal statement + newly identified Knowledge Graph gaps (e.g., access token security risk signals).
- **Output JSON Envelope:**
```json
{
  "proposed_statement": "Build a React-based video streaming application with JWT authorization, password hashing, and token rotation.",
  "change_summary": "Added password hashing and token rotation modules.",
  "user_explanation_prompt": "While reviewing your project, we identified that storing JWT access tokens without rotation leaves them vulnerable to theft. We recommend refining your goal to include 'token rotation' and 'password hashing' to ensure industry-standard security. Would you like to update your goal roadmap to include these safety practices?",
  "explainability": {
    "confidence": 0.94,
    "reasoning": "Proposed Goal upgrade to version 2. Appended JWT rotation and hashing because learner is building auth services, which requires secure storage models to prevent credentials hijacking.",
    "traced_to": [
      "knowledge_regression:access_token_insecure_storage",
      "goal:c03f56a3-2287-41ab-85cf-252199b50e39"
    ]
  }
}
```
