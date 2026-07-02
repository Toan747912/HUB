# Knowledge Prompt Architecture

- **Status:** Approved Design Document
- **Domain Scope:** Knowledge Domain & Engine
- **Traceability:** DECISION-023 (Controlled Expansion), DECISION-027 (Explainability First, traced_to[])

---

## 1. Capability: Deep Graph Expansion Reasoning (D4)

This capability evaluates whether a proposed curriculum specialisation fits into the canonical graph, creates appropriate edges, and generates a structured explanation.

### 1.1 Input Prompt Context
* **Input Parameters:**
  ```json
  {
    "context_learner_goals": [
      {
        "goal_id": "UUID",
        "title": "String (e.g. 'Learn NodeJS Backend Security')"
      }
    ],
    "graph_context": {
      "parent_node": {
        "knowledge_node_id": "UUID",
        "title": "String (e.g. 'JSON Web Tokens')"
      },
      "existing_child_nodes": [
        { "knowledge_node_id": "UUID", "title": "String" }
      ]
    },
    "proposed_expansion_label": "String (e.g. 'JWT Signature Verification')"
  }
  ```

### 1.2 System Prompt Template
```
You are the Knowledge Engine Curriculum Author for AI Mentor OS.
Your task is to evaluate the integration of a proposed sub-concept or specialization into the Directed Acyclic Graph (DAG) of the Knowledge Graph.

Constraints:
1. Ensure the new node name is unique and semantic.
2. Formulate exactly 1 reason justifying why this node represents a distinct, teachable skill that expands on parent_node.
3. Establish directed prerequisite edges. Avoid cyclic dependencies.
4. Output must return the traced_to array referencing context inputs.
```

### 1.3 Output Contract (Layer 1 Capability Output Envelope)
```json
{
  "expansion_approved": true,
  "node": {
    "title": "JWT Signature Verification",
    "description": "Verification of JWT token validity using signature algorithms (e.g. RS256, HS256) and public key matches."
  },
  "edges": [
    {
      "from_knowledge_node_id": "<parent_node.knowledge_node_id>",
      "relation_type": "expands_to"
    }
  ],
  "reasoning": "JWT Signature Verification represents a distinct cryptographic skill required to apply JWT tokens securely, extending basic token payload parsing.",
  "traced_to": ["goal:<goal_id>"]
}
```

---

## 2. Capability: Local Graph Mapping Hints (D5)

This capability maps learner queries dynamically to existing nodes or suggests temporary local nodes without mutating the global catalog.

### 2.1 Input Parameters
```json
{
  "learner_query": "String (e.g. 'How do I stop XSS when storing JWTs?')",
  "active_roadmap_context": {
    "current_roadmap_node_id": "UUID",
    "mapped_knowledge_node": "Token Storage Best Practices"
  }
}
```

### 2.2 Output Contract
```json
{
  "mapped_to_existing_node": true,
  "matched_knowledge_node_id": "<knowledge_node_id_of_Token_Storage_Best_Practices>",
  "local_hints": [
    "Verify if learner is referencing Cookie storage options vs localStorage."
  ],
  "reasoning": "Learner query directly addresses XSS prevention which is a core concept mapped to the Token Storage Best Practices node.",
  "traced_to": ["learner_message:current"]
}
```
