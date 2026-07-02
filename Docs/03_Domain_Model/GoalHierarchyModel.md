# Goal Hierarchy Model Specification

This document defines how complex learning objectives are structured into sub-goals, outlining nesting rules, dependency constraints, inheritance behaviors, and structural conflict prevention.

---

## 1. Goal Relationships: Parents, Children, and Prerequisites

To support complex learning pathways, the system allows goals to be broken down into nested structures or linked sequentially. These are mapped via the `goal_relationship` entity:

```
                  ┌──────────────────────────────┐
                  │          Parent Goal         │
                  │   "Build Full-Stack App"     │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
          ┌──────────────┐                ┌──────────────┐
          │  Sub-Goal A  │ ◄─prerequisite─│  Sub-Goal B  │
          │ "JWT Service"│                │"Video Upload"│
          └──────────────┘                └──────────────┘
```

### 1.1 Relation Types
1. **Parent-Child (`parent_child`):** Represents structural decomposition. The parent goal is a composite objective composed of its child sub-goals.
2. **Dependency (`prerequisite`):** Represents sequential order. Goal B requires Goal A to be completed before Goal B can be activated.

---

## 2. Hierarchy Invariants and Nesting Limits

To maintain system performability and cognitive clarity, the following strict bounds are applied to the relationship graph:

### 2.1 Nesting Depth Limit
- The hierarchy depth is capped at a maximum of **3 levels**:
  - **Level 1 (Root/Parent):** Major real-world project or career target (e.g., "Become a Backend Developer").
  - **Level 2 (Sub-Goal):** Functional domain milestone (e.g., "Master JWT Authentication Services").
  - **Level 3 (Micro-Goal):** Specific isolated project requirement (e.g., "Implement Token Rotation in Express").
- **Enforcement:** Any request to link Goal X as a child of Goal Y is rejected if the transitive depth of the resulting tree exceeds 3.

### 2.2 Parent Completion Constraint
- A Parent Goal **cannot** transition to the `Completed` state until **all** of its registered child sub-goals are in the `Completed` state.
- If the parent's roadmap criteria are met but a child goal remains incomplete, the parent goal's status is blocked from transitioning.

### 2.3 Prerequisite Activation Constraint
- A Goal with active prerequisite dependencies **cannot** transition to the `Active` state until all its prerequisite goals are `Completed`.
- The system keeps dependent sub-goals in the `Draft` state until their dependencies are satisfied.

---

## 3. Cycle Prevention and Reachability Checks

To prevent infinite loops in progress tracking and roadmap generation, the Goal Domain enforces a strict Directed Acyclic Graph (DAG) structure.

### 3.1 Cycle Check Algorithm (Reachability)
Before writing any record to `goal_relationship` linking Goal A to Goal B, the domain service runs a reachability query:
1. It traverses all relationships transitively to check if Goal B is already a parent or prerequisite of Goal A.
2. If B can reach A, the connection is rejected as it would form a cycle ($A \rightarrow B \rightarrow A$).

```sql
-- Transitive reachability check logic (SQL Server representation)
WITH GoalReachability AS (
    -- Anchor: direct relations where target is B
    SELECT target_goal_id, source_goal_id
    FROM dbo.goal_relationship
    WHERE target_goal_id = @GoalB
    
    UNION ALL
    
    -- Recursive step: follow relations upstream
    SELECT r.target_goal_id, r.source_goal_id
    FROM dbo.goal_relationship r
    INNER JOIN GoalReachability gr ON r.target_goal_id = gr.source_goal_id
)
SELECT COUNT(1) FROM GoalReachability WHERE source_goal_id = @GoalA;
-- If Count > 0, a path already exists from B to A. Creating A -> B would cause a cycle!
```

---

## 4. Single-Active Invariant in Hierarchies

Since a learner can only have one Active goal session at a time, hierarchies are governed by the following concurrency rules (DECISION-054):

- **Orchestration Context:** Only one **leaf goal** in the active hierarchy can have an active `LearningSession` and run Socratic interactions.
- **Parent State:** Parent goals of the active leaf goal are marked as `Active` (indicating they are in progress) but do not spawn their own duplicate concurrent learning sessions.
- **Switching Focus:** If a learner switches focus to a different sub-goal in the same hierarchy:
  1. The active Socratic sub-session of the current leaf goal is ended.
  2. The current leaf goal's learning session is set to `Paused`.
  3. The target sub-goal's session is set to `Active`, and its corresponding sub-session is launched.
  4. The root Parent Goal's state remains `Active` throughout this switch.
