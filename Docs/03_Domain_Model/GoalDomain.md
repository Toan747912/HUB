# Goal Domain Specification

This document defines the core boundaries, responsibilities, aggregate structures, and invariants of the **Goal Domain** within the **AI Mentor OS** architecture.

---

## 1. Domain Overview and Responsibilities

The **Goal Domain** is a transactional Core Domain (identified as Core Domain #2 in [CoreDomainMap.md](CoreDomainMap.md)). It represents the root of a learner's educational path, translating real-world objectives into actionable curriculum structures.

### 1.1 Core Responsibilities
1. **Goal Aggregation:** Serving as the definitive transactional source of truth for learner goals.
2. **Immutable Versioning Control:** Enforcing the absolute immutability of goal definitions and statements (DECISION-032).
3. **Roadmap Mapping:** Providing the immutable root link for dynamic roadmap structures ($Goal \text{ 1---1 } Roadmap$).
4. **Hierarchy & Relationship Enforcement:** Maintaining parent-child relationships between goals while preventing structural cycles.
5. **Governance Boundaries:** Interfacing with learner confirmations (`ApprovalRecord`) to ensure human authority over state modifications.

---

## 2. Bounded Context and Aggregate Boundary

### 2.1 The `Goal` Aggregate Root
Under DDD guidelines, `Goal` is a standalone Aggregate Root. It does not contain `Roadmap` or `RoadmapNode` inside its transactional boundary, but rather links to them via a strict reference ID.

```
┌──────────────────────────────────────────────────────────────────┐
│ Goal (Aggregate Root)                                            │
│                                                                  │
│   ├── goal_id (UUID, PK)                                         │
│   ├── learner_id (UUID, FK -> Learner)                           │
│   ├── statement (Text)                                           │
│   ├── state (Draft | Active | Paused | Completed |               │
│   │          Superseded | Archived)                              │
│   ├── parent_goal_id (UUID, Nullable, FK -> Goal)                │
│   ├── superseded_by_goal_id (UUID, Nullable, FK -> Goal)         │
│   ├── created_at (Timestamptz)                                   │
│   ├── created_by_actor_type (Text)                               │
│   └── created_by_actor_id (UUID, Nullable)                       │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Domain Write Ownership
- **Write Owner:** **Goal & Roadmap Domain** (via explicit Learner approval).
- **AI Engine Boundaries:** No AI capability (Discovery, Recommendation, Teaching, Assessment) can directly write to or update a `Goal` record. AI engines may only:
  - Generate a `DiscoverySession` to help refine or clarify goals.
  - Propose goal creations or transitions through the `RecommendationProposal` entity.
  - Check mastery alignment to recommend goal completion.
- **The Learner Approval Constraint:** All modifications, creations, and transitions of a Goal require an explicit learner action, which is logged via an `ApprovalRecord` before committing to the database.

---

## 3. Structural Rules & Invariants

To ensure the integrity of the database and learning history, the Goal Domain enforces the following invariants:

### 3.1 Single-Active Invariant
- **Rule:** A Learner can have at most **one** Goal in the `Active` state at any given point in time.
- **Enforcement:** If a new Goal is activated, any currently `Active` goal for that Learner must be transitioned to `Superseded` or `Archived` in the same transaction.

### 3.2 Immutability Invariant (DECISION-032)
- **Rule:** A created Goal is physically and logically immutable. The `statement` of a goal cannot be updated.
- **Enforcement:** Any change to a goal's statement or structural scope requires the creation of a new `Goal` record, transitioning the old record to the `Superseded` state.

### 3.3 Goal Hierarchy DAG Invariant
- **Rule:** Parent-child relations between goals must form a Directed Acyclic Graph (DAG). No goal can reference itself or any of its descendants as its parent.
- **Nesting Limit:** The hierarchy depth is capped at a maximum of **3 levels** (e.g., Parent Goal ➔ Sub-Goal ➔ Micro-Goal) to prevent cognitive overload and database query recursion bloat.

### 3.4 Terminal State Invariant
- **Rule:** Once a Goal transitions into a terminal state (`Completed`, `Superseded`, or `Archived`), its state is frozen permanently.
- **Enforcement:** The system rejects any database updates attempting to move a goal out of a terminal state.

---

## 4. Domain Events

The Goal Domain communicates state changes to other domains via the following domain events:

| Event | Trigger Condition | Consuming Domains / Action |
|---|---|---|
| `GoalDefined` | Emitted when a new Goal is created and set to `Active`. | **Learning Session Domain:** Starts a new `LearningSession` and initializes the active timeline. |
| `GoalPaused` | Emitted when an Active Goal is paused. | **Learning Session Domain:** Transitions the active `LearningSession` to `Paused`. |
| `GoalResumed` | Emitted when a Paused Goal is set back to Active. | **Learning Session Domain:** Resumes the `LearningSession` (moves to `Active`). |
| `GoalCompleted` | Emitted when all completion criteria are verified. | **Recommendation Domain:** Evaluates signals to recommend subsequent goals. |
| `GoalSuperseded` | Emitted when a goal is replaced by a new version. | **Learning Session Domain:** Archives the corresponding `LearningSession` (DECISION-032). |
| `GoalArchived` | Emitted when a goal is manually archived. | **Learning Session Domain:** Transitions the current session to `Archived`. |
