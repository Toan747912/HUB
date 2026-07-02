# Roadmap Node Model Specification

This document defines the structural classifications, dependency rules, prerequisite chains, and completion algorithms for the `RoadmapNode` entities in the **AI Mentor OS**.

---

## 1. Roadmap Node Classifications

A `RoadmapNode` represents a structural unit of study. Nodes are categorized into four types:

```
                            RoadmapNode
                                 │
         ┌───────────────┬───────┴───────┬───────────────┐
         ▼               ▼               ▼               ▼
   [Milestone]      [Learning]      [Assessment]    [Optional]
  Group node.       Leaf node.       Verification     Elective path.
  No knowledge      Maps to N        point for        Does not block
  mapping.          KnowledgeNodes.  Socratic tests.  parent completion.
```

### 1.1 Milestone Nodes
- **Definition:** Grouping nodes (parent nodes in the roadmap tree, e.g. "Database Fundamentals").
- **Constraint:** Milestone nodes **MUST NOT** map directly to `KnowledgeNode`s. Their completion status is derived entirely from their child nodes.

### 1.2 Learning Nodes
- **Definition:** Leaf nodes representing core study topics (e.g. "JWT Authentication").
- **Constraint:** Mapped to $N$ `KnowledgeNode`s via `roadmap_node_knowledge_node` (Dependency Edges).

### 1.3 Assessment Nodes
- **Definition:** Explicit checkpoint nodes inserted into the pathway to verify concept retention.
- **Constraint:** Launches a Socratic Probe session. Requires a passing `AssessmentResult` to be marked complete.

### 1.4 Optional Nodes
- **Definition:** Elective pathways suggested by the AI (e.g., "Advanced Query Optimization").
- **Constraint:** Optional nodes **do not** block the completion of their parent Milestone node or the parent Goal.

---

## 2. Dependency Rules and Prerequisite Chains

Roadmap nodes are chained sequentially using the `roadmap_node_dependency` table.

```
       RoadmapNode A (Completed) ➔ RoadmapNode B (Unlocked) ➔ RoadmapNode C (Locked)
```

### 2.1 State Transitions for Nodes
A node's status follows a strict unlock sequence:
- **Locked:** Default state when prerequisite nodes are not yet completed. The learner cannot access this node.
- **Unlocked:** Transitions from Locked when all prerequisite nodes are marked `Completed`.
- **In_Progress:** Transitions from Unlocked when the learner launches a `SubSession` targeting this node.
- **Completed:** Transitions from In_Progress when all completion criteria are verified.

### 2.2 Unlocking Logic
Whenever a `RoadmapNode` completes, the Roadmap Domain executes a sweep of all dependent nodes:
$$\text{Unlocked}(Node) \iff \forall P \in \text{Prerequisites}(Node): \text{NodeStatus}(P) = \text{'Completed'}$$

---

## 3. Node Completion Rules

Completion evaluation is executed from bottom to top:

### 3.1 Leaf Learning Node Completion
A learning node is completed when all its linked `KnowledgeNode`s meet Socratic mastery (composite score $\ge 75\%$, DECISION-052):
$$\text{LearningNode} = \text{Completed} \iff \forall K \in \text{KnowledgeNodes}(Node): \text{MasteryScore}(K) \ge 0.75$$

### 3.2 Parent Milestone Completion
A parent milestone node is completed when all of its non-optional child nodes are completed:
$$\text{MilestoneNode} = \text{Completed} \iff \forall C \in \text{Children}(Node) \setminus \text{OptionalChildren}: \text{NodeStatus}(C) = \text{'Completed'}$$
