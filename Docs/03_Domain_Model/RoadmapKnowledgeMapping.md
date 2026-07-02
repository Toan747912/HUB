# Roadmap-Knowledge Mapping Specification

This document details the M:N relationship between the **Roadmap Domain** and the **Knowledge Graph Domain**, outlining graph separation rules, progression triggers, and local expansion constraints.

---

## 1. Graph Separation and Bounded Contexts (DECISION-015)

The Roadmap Graph and the Knowledge Graph represent two distinct structures:
1. **Roadmap Graph:** A learner-specific hierarchical tree detailing the learning path (Milestone Nodes ➔ Learning Nodes).
2. **Knowledge Graph:** A global, shared Directed Acyclic Graph (DAG) detailing concept dependencies (Knowledge Nodes ➔ Prerequisite Edges).

```
[Roadmap Domain context]                     [Knowledge Graph Domain context]

   Roadmap Node B                            KnowledgeNode B1 (JWT Claims)
  "JWT Authentication"                       KnowledgeNode B2 (JWT Signature)
         │                                   KnowledgeNode B3 (JSON Hashing)
         ▼                                           │
  Mapped M:N via ────────────────────────────▶  Many-to-Many
  roadmap_node_knowledge_node                 Dependency Links
```

### 1.1 M:N Junction Table Structure
The connection is established using the `roadmap_node_knowledge_node` table:
- `roadmap_node_id` (FK ➔ `roadmap_node` in Goal & Roadmap Domain)
- `knowledge_node_id` (FK ➔ `knowledge_node` in Knowledge Graph Domain)
- **Constraint:** `ON DELETE RESTRICT` is enforced on both foreign keys to prevent structural decoupling.

---

## 2. Progression Rules

A leaf `RoadmapNode`'s progression is calculated dynamically based on the mastery scores of its linked `KnowledgeNode`s:

- **Unlocking Prerequisite Node:** When a learner targets a leaf `RoadmapNode`, the system inspects all mapped `KnowledgeNode`s.
- **Completion Trigger:** A leaf `RoadmapNode` status is updated to `Completed` when all of its linked `KnowledgeNode` masteries satisfy the composite threshold:
  $$\forall K \in \text{LinkedNodes}(Node): \text{Score}_{Teach}(K) \ge 0.75 \implies \text{NodeStatus}(Node) = \text{'Completed'}$$

---

## 3. Graph Synchronization and Local Expansion Impact

### 3.1 Local Knowledge Expansion Boundary (DECISION-023)
During Socratic instruction, the Socratic capability may trigger a **Local Expansion** (D5), adding detailed helper nodes and prerequisite edges to the learner's Knowledge Graph context.
- **Strict Rule:** Local expansions **MUST NOT** mutate or insert any `RoadmapNode` records.
- **Behavior:** The roadmap tree remains structurally identical. The expanded knowledge nodes are taught in Socratic session mode as child concepts of the active leaf `RoadmapNode` context.

### 3.2 Master Graph Updates
If a global `KnowledgeNode` is restructured or deleted in the master repository:
1. The **Recommendation Engine** detects the change as a dependency gap.
2. It generates a `RecommendationProposal` suggesting a roadmap adjustment.
3. The Goal & Roadmap Domain executes the update **only** after the learner approves the change (`ApprovalRecord` created). No automated structural updates can occur on an active roadmap.
