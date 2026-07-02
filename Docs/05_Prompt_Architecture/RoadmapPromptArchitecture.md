# Roadmap Prompt Architecture Specification

This document defines the prompting strategies, system instructions, context mappings, and JSON output envelopes for AI-driven roadmap operations (generation, critique, refinement, and superseding) within the **AI Mentor OS**.

---

## 1. Roadmap Generation Prompt

Generates the initial draft roadmap structure (Milestone and Learning Nodes) from the clarified Goal statement.

### 1.1 Prompt Template
```
Role: Curriculum Architect AI.
Task: Create a logical, progressive learning roadmap for the user's active Goal.

Structural Invariants:
1. Output a hierarchical tree. Limit depth to a maximum of 3 levels.
2. Group related lessons under 'Milestone' nodes.
3. Mark specific study nodes as 'Learning' nodes.
4. Leaf Learning nodes must reference specific, discrete concepts in the global Knowledge Graph.

JSON Output Schema:
Provide a JSON object matching the required schema. Ensure the explainability block is fully populated.
```

### 1.2 Input and Output Contracts
- **Input Context:** Goal Statement + Learner claimed skill areas.
- **Output JSON Envelope:**
```json
{
  "proposed_nodes": [
    {
      "title": "Backend Fundamentals",
      "node_type": "Milestone",
      "sequence_number": 1,
      "children": [
        {
          "title": "HTTP Protocols",
          "node_type": "Learning",
          "sequence_number": 1,
          "mapped_knowledge_nodes": ["http_protocol"]
        }
      ]
    }
  ],
  "explainability": {
    "confidence": 0.95,
    "reasoning": "Constructed backend path beginning with HTTP protocols as a prerequisite milestone. Mapped directly to the global HTTP concept node.",
    "traced_to": [
      "goal:c03f56a3-2287-41ab-85cf-252199b50e39"
    ]
  }
}
```

---

## 2. Roadmap Critique & Refinement Prompt

Analyzes the active roadmap against learner performance telemetry (Assessment signals, mismatches, or regression) to propose corrections.

### 2.1 Prompt Template
```
Role: Educational Critic & Auditor AI.
Task: Analyze the learner's active roadmap and identify structural gaps or issues based on telemetry data (e.g. repeated test failures).

Refinement Guidelines:
- If the learner is struggling with concept X, propose inserting a prerequisite learning node before the active node.
- Do not make automatic edits. Propose the change clearly.
```

### 2.2 Input and Output Contracts
- **Input Context:** Active Roadmap structure + `SelfAssessmentMismatch` signals + `KnowledgeRegression` event details.
- **Output JSON Envelope:**
```json
{
  "action": "insert_prerequisite",
  "target_node_id": "n01f56a3-2287-41ab-85cf-252199b50e02",
  "proposed_node": {
    "title": "Basic SQL Queries",
    "node_type": "Learning",
    "mapped_knowledge_nodes": ["sql_basics"]
  },
  "user_explanation": "Based on your assessment mismatch in databases, we suggest adding a prerequisite module on Basic SQL Queries before tackling Database Schema Optimization. Would you like to add this to your path?",
  "explainability": {
    "confidence": 0.89,
    "reasoning": "Detected SQL performance mismatch in Assessment. Proposing insert of basic SQL learning node as a prerequisite.",
    "traced_to": [
      "self_assessment_mismatch:sam03f56-2287-41ab-85cf-252199b50e70"
    ]
  }
}
```

---

## 3. Roadmap Superseding Prompt

Clones the roadmap and injects updates when the learner changes their goal statement.

### 3.1 Prompt Template
```
Role: Re-Mapping Architect AI.
Task: Transition the learner's path to fit their updated goal. Clone the completed milestones from the previous roadmap version and append/alter nodes to fit the new scope.

JSON Output Schema:
Generate the modified node tree in JSON format.
```

### 3.2 Input and Output Contracts
- **Input Context:** Predecessor Roadmap structure + Completed nodes list + New Goal Statement.
- **Output JSON Envelope:**
```json
{
  "cloned_roadmap_id": "r03f56a3-2287-41ab-85cf-252199b50e50",
  "proposed_statement": "Build React app with JWT rotation.",
  "node_mutations": {
    "preserve_completed_nodes": [
      "n01f56a3-2287-41ab-85cf-252199b50e01"
    ],
    "added_nodes": [
      {
        "title": "Token Rotation Security",
        "node_type": "Learning",
        "mapped_knowledge_nodes": ["jwt_rotation"]
      }
    ]
  },
  "explainability": {
    "confidence": 0.96,
    "reasoning": "Superseded roadmap to version 2. Preserved Completed HTTP node and appended Token Rotation learning node to cover the updated goal scope.",
    "traced_to": [
      "goal:d03f56a3-2287-41ab-85cf-252199b50e40",
      "roadmap:r03f56a3-2287-41ab-85cf-252199b50e50"
    ]
  }
}
```
