# Roadmap Domain Specification

This document defines the core boundaries, responsibilities, aggregate structures, and invariants of the **Roadmap Domain** within the **AI Mentor OS** architecture.

---

## 1. Domain Overview and Responsibilities

The **Roadmap Domain** is a Core Domain (Core Domain #2 in [CoreDomainMap.md](CoreDomainMap.md)). It represents the hierarchical path of learning milestones designed for a specific Goal.

### 1.1 Core Responsibilities
1. **Hierarchical Pathway Management:** Managing the parent-child tree structure of learning milestones and nodes.
2. **Lazy Expansion (Dynamic Roadmap):** Supporting lazy structural expansion as the learner progresses, instead of upfront full generation (DECISION-005).
3. **Approval Governance:** Enforcing that every structural change is proposed by AI but must be explicitly approved by the learner (DECISION-006).
4. **Knowledge Separation:** Keeping the roadmap tree structurally distinct from the global Knowledge Graph DAG (DECISION-015).

---

## 2. Bounded Context and Aggregate Structure

Under DDD guidelines, `Roadmap` is the Aggregate Root. `RoadmapNode` and `ApprovalRecord` are entities contained within the `Roadmap` aggregate boundary.

```
┌──────────────────────────────────────────────────────────────────┐
│ Roadmap (Aggregate Root)                                         │
│                                                                  │
│   ├── roadmap_id (UUID, PK)                                      │
│   ├── goal_id (UUID, FK -> Goal, 1:1, Unique)                    │
│   ├── state (Draft | Proposed | Approved | Active | Completed |  │
│   │          Superseded | Archived)                              │
│   │                                                              │
│   ├── roadmap_nodes[] (Entities inside Aggregate)                │
│   │     ├── roadmap_node_id (UUID, PK)                           │
│   │     ├── parent_roadmap_node_id (UUID, Nullable, FK -> self)  │
│   │     ├── title (Text)                                         │
│   │     ├── status (Locked | Unlocked | In_Progress | Completed) │
│   │     ├── sequence_number (Int)                                │
│   │     ├── collapsed (Boolean)                                  │
│   │     └── node_type (Milestone | Learning | Assessment |       │
│   │                    Optional)                                 │
│   │                                                              │
│   └── approval_records[] (Entities inside Aggregate)             │
│         ├── approval_record_id (UUID, PK)                        │
│         ├── transaction_details (Text/JSON)                      │
│         └── confirmed_at (Timestamptz)                           │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 Domain Write Ownership
- **Write Owner:** **Goal & Roadmap Domain** (via explicit Learner approval).
- **The Proposal-Only Constraint (DECISION-006/019):** AI Engines (Roadmap Engine, Recommendation Engine) have **no write access** to mutate the active Roadmap aggregate directly. They can only issue a `RecommendationProposal`. The transition is applied by the Goal & Roadmap Domain after the learner confirms the action (generating an `ApprovalRecord`).

---

## 3. Structural Rules & Invariants

### 3.1 1:1 Goal Mapping Invariant
- **Rule:** Every `Roadmap` record must be linked to exactly one `Goal` record via `goal_id`.
- **Enforcement:** The database maintains a `UNIQUE` constraint on the `goal_id` column of the `roadmap` table.

### 3.2 Tree Hierarchy Invariant
- **Rule:** The `RoadmapNode` structure must form a tree. Each node can have at most one parent node (mapped via `parent_roadmap_node_id`).
- **Enforcement:** Self-referencing FK checks prevent multi-parent allocations for roadmap nodes (distinguishing them from the Knowledge Graph DAG, which supports multi-parent nodes).

### 3.3 Goal Immutability Integration (DECISION-032)
- **Rule:** If the parent Goal is superseded (scope modified), the linked Roadmap is also frozen and marked as `Superseded`.
- **Enforcement:** The system clones the roadmap nodes onto a new `Roadmap` record mapped to the new Goal version.

### 3.4 Node Completion Invariant
- **Rule:** A parent `RoadmapNode` status can only transition to `Completed` if and only if all of its child nodes are `Completed`.
- **Enforcement:** The domain service triggers bottom-up evaluation checks whenever a leaf node status transitions to `Completed`.

---

## 4. Domain Events

The Roadmap Domain emits the following domain events:

| Event | Trigger Condition | Consuming Domains / Action |
|---|---|---|
| `RoadmapProposed` | Generated when the Roadmap Engine suggests a new roadmap or branch expansion. | **Mentor Interaction:** Displays the proposed pathway in the chat/UI context. |
| `RoadmapApproved` | Generated when the learner approves the proposed roadmap or branch expansion. | **Goal & Roadmap Domain:** Commits structural mutations to the database. |
| `RoadmapNodeUnlocked` | Emitted when a node's prerequisite nodes are completed. | **Mentor Interaction / Learning Session:** Unlocks the learning modules. |
| `RoadmapNodeCompleted` | Emitted when a node is fully completed (all dependent KnowledgeNodes mastered). | **Recommendation Domain:** Triggers progression routing. |
| `RoadmapCompleted` | Emitted when all roadmap nodes are completed. | **Goal Domain:** Generates a goal completion recommendation. |
