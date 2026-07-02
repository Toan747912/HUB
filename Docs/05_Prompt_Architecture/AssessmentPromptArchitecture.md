# Assessment Prompt Architecture

- **Status:** Approved Design Document
- **Domain Scope:** Assessment Domain & Engine
- **Traceability:** DECISION-026 (Assessment owners), DECISION-030 (AssessmentResult structure)

---

## 1. Capability: Open-Ended Probe Evaluation

This capability evaluates a learner's conversational response to a verification probe, mapping it to Bloom's taxonomy.

### 1.1 Input Prompt Context
* **Input Parameters:**
  ```json
  {
    "knowledge_node": {
      "knowledge_node_id": "UUID",
      "title": "String (e.g. 'JWT Signature Verification')",
      "description": "String"
    },
    "probe_interaction": {
      "question_text": "String",
      "learner_raw_answer": "String"
    }
  }
  ```

### 1.2 System Prompt Template
```
You are the Assessment Engine Evaluator for AI Mentor OS.
Your task is to analyze the learner's response to the specific verification probe and assess their level of understanding for the target knowledge node.

Evaluation Scale:
- Remember: Learner recalls syntax or vocabulary but does not explain logic.
- Explain: Learner explains the core principles and reasoning accurately.
- Apply: Learner demonstrates practical execution logic.
- Teach: Learner identifies bugs, simplifies concepts, or critiques choices.

Required JSON Output:
- assessed_level: Exactly one value of the scale.
- confidence: A decimal float between 0.00 and 1.00 indicating evaluation certainty.
- reasoning: Explain the assessment rationale in the learner's local language (Vietnamese).
- traced_to: Array referencing source ID: ["probe_response:current"].
```

### 1.3 Output Contract (Layer 1 Capability Output Envelope)
```json
{
  "assessed_level": "Explain",
  "confidence": 0.90,
  "reasoning": "Người học giải thích chính xác cơ chế chữ ký khóa công khai (RS256) và cách khớp hash, chứng minh khả năng tự diễn giải (Level: Explain).",
  "traced_to": ["probe_response:current"]
}
```

---

## 2. Capability: Teach Scenario Evaluation

This capability analyzes a learner's behavior during a teach-level peer review or guide debugging scenario to score the 5 sub-capabilities.

### 2.1 Input Parameters
```json
{
  "knowledge_node": {
    "title": "Token Storage Best Practices"
  },
  "teach_dialogue_log": [
    { "role": "peer_learner", "text": "I store my token in a cookie. Is that safe?" },
    { "role": "learner", "text": "It depends. If you use HttpOnly and Secure flags, it protects against XSS, which is safer than localStorage." }
  ]
}
```

### 2.2 Output Contract
```json
{
  "sub_capabilities": {
    "explain": 0.90,
    "simplify": 0.80,
    "guide": 0.85,
    "review": 0.90,
    "transfer": 0.70
  },
  "confidence": 0.95,
  "reasoning": "Người học chỉ ra đúng lỗ hổng XSS của localStorage, đề xuất giải pháp cookie với HttpOnly/Secure và giải thích mạch lạc (Level: Teach).",
  "traced_to": ["teach_dialogue_log:current"]
}
```
