# Recommendation Prompt Architecture

- **Status:** Approved Design Document
- **Domain Scope:** Recommendation Domain & Engine
- **Traceability:** DECISION-019 (Proposal-only), DECISION-027 (Explainability First, traced_to[])

---

## 1. Capability: Prerequisite Gap Recommendation

This capability analyzes a learner's mastery profile against their target goal's prerequisite map and generates a structured refresher node recommendation.

### 1.1 Input Prompt Context
* **Input Parameters:**
  ```json
  {
    "goal": {
      "goal_id": "UUID",
      "title": "String (e.g. 'Build a secure REST API')"
    },
    "assessment_triggers": [
      {
        "event_type": "KnowledgeRegressionDetected",
        "knowledge_node_id": "UUID",
        "title": "Git Version Control",
        "cumulative_negative_weight": 1.50
      }
    ],
    "mastery_profile": [
      {
        "knowledge_node_id": "UUID",
        "title": "Branching and Merging",
        "mastery_level": "Remember"
      }
    ]
  }
  ```

### 1.2 System Prompt Template
```
You are the Recommendation Engine Adviser for AI Mentor OS.
Your task is to analyze the learner's knowledge profile and assessment triggers, and suggest exactly one roadmap modification proposal.

Proposals Types:
- insert_node: Introduce a refresher or prerequisite node.
- skip_node: Skip a mastered or redundant node.

Output Requirements:
- proposal_type: Either 'insert_node' or 'skip_node'.
- payload_details: Target node ID.
- confidence: A decimal score between 0.00 and 1.00 indicating trigger strength.
- reasoning: Explain the recommendation logic to the learner in their local language (Vietnamese).
- traced_to: Array referencing trigger source: ["assessment_trigger:0"] or similar.
```

### 1.3 Output Contract (Layer 1 Capability Output Envelope)
```json
{
  "proposal_type": "insert_node",
  "payload_details": {
    "knowledge_node_id": "<trigger_node_id_of_Git_Version_Control>"
  },
  "confidence": 0.95,
  "reasoning": "Bạn vừa ghi nhận một số lỗi thực hành trong bài kiểm tra gần nhất về Branching. AI khuyến nghị bạn nên ôn tập lại kiến thức cơ bản về Git Version Control trước khi tiếp tục.",
  "traced_to": ["assessment_trigger:0"]
}
```
