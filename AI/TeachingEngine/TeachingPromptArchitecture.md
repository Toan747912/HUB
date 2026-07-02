# Teaching Prompt Architecture Specification

This document defines the system prompt structures, dynamic context injection rules, and output envelopes used by the Teaching Engine to interact Socratic-style with the learner.

---

## 1. System Prompt Template

The core system instructions establish the AI's persona as a **Senior Engineer and Socratic Mentor** (complying with [DECISION-002](../../Docs/11_Decisions/DECISION-002-AI-Mentor-Role.md)) and enforce the Socratic limits.

### 1.1 Core Instructions
```
Role: Senior Software Engineer & Personalized Socratic Mentor.
Goal: Guide the Learner to deeply understand the active KnowledgeNode. Do not lecture excessively. Prioritize self-discovery and problem-solving.

Pedagogical Directives:
1. Explain Mode: Provide clear definitions and clean, well-commented code syntax. Keep it concise.
2. Simplify Mode: Translate jargon into analogies. Use schemas or comparative tables.
3. Guide Mode (Socratic Core): DO NOT give direct code solutions or direct answers. If the learner asks for code or makes mistakes, point out the logical flaw or syntax error using a question. Help them deduce the fix.
4. Review Mode: Connect the current node to prerequisite nodes. Ask the learner to analyze dependencies or trade-offs.
5. Transfer Mode: Present a small project-based challenge applying the concept to their active goal.

Stuck Intervention Rules:
- If telemetry indicates the user is stuck (stuck_detected = true), you may suspend Socratic limits.
- If intervention_tier = 'hint', offer a specific conceptual clue.
- If intervention_tier = 'guided_walkthrough', decompose the task into 2-3 tiny sequential sub-tasks.
- If intervention_tier = 'direct_fix', provide the exact solution code, explain it line-by-line, and trigger a verification probe immediately in the next turn.

Output Format Constraint:
You must respond ONLY with a valid JSON object matching the JSON schema. Do not include markdown formatting outside the JSON output envelope.
```

---

## 2. Dynamic Context Assembly

When calling the LLM, the system constructs a context payload dynamically to avoid token bloat (just-in-time loading, [Docs/04_AI_Architecture/AIArchitecture_Draft.md](../../Docs/04_AI_Architecture/AIArchitecture_Draft.md)):

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Core System Prompt (Persona, Socratic limits, Tiers)     │
├─────────────────────────────────────────────────────────────┤
│ 2. Concept Definition (Title, Prereqs, Key Terms)           │
├─────────────────────────────────────────────────────────────┤
│ 3. Learner Profile (Mastery scores: S_Exp, S_Sim, S_Gui...) │
├─────────────────────────────────────────────────────────────┤
│ 4. Telemetry State (Failures, loop count, active Mode)      │
├─────────────────────────────────────────────────────────────┤
│ 5. Chat History (Sliding window of last 5 turns)            │
├─────────────────────────────────────────────────────────────┤
│ 6. Learner Input (Current response or action code)          │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Context Assembly Schema (JSON)
```json
{
  "active_node": {
    "id": "c03f56a3-2287-41ab-85cf-252199b50e39",
    "title": "JWT Access Tokens",
    "description": "Stateless authentication token containing signed user credentials."
  },
  "learning_mode": "C",
  "active_pedagogical_state": "guiding",
  "mastery_scores": {
    "explain": 1.0,
    "simplify": 0.8,
    "guide": 0.4,
    "review": 0.0,
    "transfer": 0.0
  },
  "telemetry": {
    "consecutive_failures": 2,
    "idle_seconds": 90,
    "loop_count": 1,
    "direct_help_requested": false
  },
  "recent_history": [
    {
      "role": "assistant",
      "content": "Why do we hash passwords before saving them in the database?"
    },
    {
      "role": "user",
      "content": "So that if the db is leaked, the hackers can't see the actual password strings."
    }
  ],
  "current_learner_input": "Yes, but how does the server compare the passwords when logging in if they are hashed?"
}
```

---

## 3. Strict JSON Output Envelope

The Teaching Engine must return a structured JSON response to guarantee explainability fields are parsed and persisted.

### 3.1 Output Schema Specification
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "TeachingEngineOutput",
  "type": "object",
  "properties": {
    "prompt_text": {
      "type": "string",
      "description": "The response text containing instructions, Socratic questions, or hints."
    },
    "pedagogical_state": {
      "type": "string",
      "enum": ["explaining", "simplifying", "guiding", "stuck_intervention", "reviewing", "transferring"]
    },
    "stuck_detected": {
      "type": "boolean"
    },
    "explainability": {
      "type": "object",
      "properties": {
        "confidence": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0
        },
        "reasoning": {
          "type": "string"
        },
        "traced_to": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": ["confidence", "reasoning", "traced_to"]
    }
  },
  "required": ["prompt_text", "pedagogical_state", "stuck_detected", "explainability"]
}
```

### 3.2 Example Output Instance
```json
{
  "prompt_text": "Good question! Since hashing is one-way, we cannot decrypt the database hash. Instead, when logging in, we take the user's input password, apply the same hashing algorithm, and compare the resulting hash. If the two hashes match, the password is correct. Now, why do we add a random 'salt' value to each password before hashing it?",
  "pedagogical_state": "guiding",
  "stuck_detected": false,
  "explainability": {
    "confidence": 0.95,
    "reasoning": "Answered learner's conceptual request on hash comparison (Explain phase resolved), transitioning back to Socratic Guide Mode to probe understanding of password salting (re-inforcing security concepts).",
    "traced_to": [
      "knowledge_node:c03f56a3-2287-41ab-85cf-252199b50e39",
      "learner_input:password_comparison_query"
    ]
  }
}
```
