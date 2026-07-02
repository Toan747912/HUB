# Learning Session Domain Specification

This document defines the core boundaries, responsibilities, aggregate structures, and invariants of the **Learning Session Domain** within the **AI Mentor OS** architecture.

---

## 1. Domain Overview and Responsibilities

The **Learning Session Domain** is a Core Domain (Core Domain #10 in [CoreDomainMap.md](CoreDomainMap.md)). It acts as the central **Orchestrator** representing the active learning state for a specific Learner×Goal.

### 1.1 Core Responsibilities
1. **Life Cycle Tracking:** Maintaining the active learning session state (Active, Paused, Completed, Archived) for a Learner×Goal.
2. **Context Coordination:** Integrating signals from Goal, Roadmap, Knowledge Graph, Evidence, Assessment, and Recommendation domains to provide a unified runtime context for AI engines.
3. **Session Fine-Granularity:** Segmenting study milestones into `SubSession` contexts mapping directly to active `RoadmapNode` requirements.
4. **Explainable History Preservation:** Archiving previous session records on goal modifications to maintain complete traceability.

---

## 2. Bounded Context and Aggregate Boundary

Under DDD guidelines, `LearningSession` is the Aggregate Root. `SubSession` is an internal entity contained within the `LearningSession` boundary. `MentorSession` belongs to a separate domain (Mentor Interaction Domain) and is referenced by `SubSession`.

```
┌──────────────────────────────────────────────────────────────────┐
│ LearningSession (Aggregate Root)                                 │
│                                                                  │
│   ├── learning_session_id (UUID, PK)                             │
│   ├── learner_id (UUID, FK -> Learner)                           │
│   ├── goal_id (UUID, FK -> Goal, 1:1, Unique)                    │
│   ├── state (Draft | Active | Paused | Completed |               │
│   │          Abandoned | Archived)                               │
│   ├── started_at (Timestamptz)                                   │
│   ├── last_active_at (Timestamptz)                               │
│   ├── ended_at (Timestamptz, Nullable)                           │
│   │                                                              │
│   └── sub_sessions[] (Entities inside Aggregate)                 │
│         ├── sub_session_id (UUID, PK)                            │
│         ├── roadmap_node_id (UUID, Nullable, FK -> RoadmapNode)  │
│         ├── knowledge_node_id (UUID, Nullable, FK -> KNode)      │
│         ├── state (Planned | Active | Completed | Cancelled)     │
│         ├── started_at (Timestamptz)                             │
│         ├── ended_at (Timestamptz, Nullable)                     │
│         └── mentor_session_refs[] (UUIDs -> MentorSession)       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Cross-Domain Ownership and Coordination

The Learning Session Domain holds read-only authority over connecting domains to prevent write-ownership conflicts:

| Target Domain | Relationship and Coordination Rule |
|---|---|
| **Goal Domain** | **Read-Only:** Listens to `GoalDefined`, `GoalArchived`, and `GoalCompleted`. When the goal is superseded, the Goal Domain creates a new goal version, and the Session Domain archives the old session and instantiates a new one. |
| **Roadmap Domain** | **Read-Only:** Reads active `RoadmapNode` states to unlock lessons. The Session Domain does not write roadmap node statuses directly. |
| **Recommendation Domain** | **Read-Only:** Subscribes to `RecommendationProposed` events (specifically for "pause" proposals). Upon learner approval, the Session Domain transitions to `Paused` (DECISION-033). |
| **Discovery Domain** | **Read-Only:** Coordinates initial discovery status (displays "Learner in Discovery" during active `DiscoverySession`). |
| **Teaching Domain** | **Reference:** `SubSession` maps reference IDs pointing to `MentorSession` entities owned by the Mentor Interaction Domain. |
| **Assessment Domain** | **Read-Only:** Listens to `AssessmentResultCreated` to update `last_active_at` and verify node completion criteria. |

---

## 4. Invariants

### 4.1 Single-Active Session Invariant
- **Rule:** A learner can have at most **one** `LearningSession` in the `Active` state at any point in time.
- **Enforcement:** If a new session is launched, any currently active session for that learner must be set to `Paused` or `Archived` in the same transaction.

### 4.2 Hierarchy Target Invariant
- **Rule:** A `SubSession` must have exactly one active target.
- **Enforcement:** A check constraint ensures that exactly one of `roadmap_node_id` or `knowledge_node_id` is populated.

### 4.3 Goal Immutability Alignment (DECISION-032)
- **Rule:** If the parent Goal is superseded, the connected LearningSession must transition to the terminal `Archived` state.
- **Enforcement:** The system rejects any update attempting to modify the `goal_id` of an existing session record.

---

## 5. Domain Events

| Event | Trigger Condition | Consuming Domains / Action |
|---|---|---|
| `LearningSessionStarted` | Emitted when a new session is initialized. | **UI / Timeline:** Renders session start state. |
| `LearningSessionPaused` | Emitted when the session transitions to `Paused` (DECISION-033). | **Teaching / Socratic Engine:** Suspends active chat interactions. |
| `LearningSessionResumed` | Emitted when the session transitions back to `Active`. | **Teaching / Socratic Engine:** Restores Socratic context. |
| `LearningSessionCompleted` | Emitted when the linked Roadmap is fully completed. | **Recommendation:** Proposes follow-up goals. |
| `LearningSessionArchived` | Emitted when the Goal is superseded or manually archived. | **Recommendation:** Triggers pipeline cleanup. |
| `SubSessionStarted` | Emitted when a sub-session starts. | **Mentor Interaction:** Maps future mentor turns to this sub-session context. |
| `SubSessionEnded` | Emitted when a sub-session is completed or cancelled. | **Assessment / Recommendation:** Evaluates progress. |
