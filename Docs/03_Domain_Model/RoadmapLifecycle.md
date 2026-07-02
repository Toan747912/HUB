# Roadmap Lifecycle Specification

This document maps the state transitions, allowed triggers, terminal states, and governance checks for the `Roadmap` Aggregate Root in the **AI Mentor OS**.

---

## 1. State Space Definitions

The lifecycle of a `Roadmap` consists of seven distinct states:

```
                  ┌─────────┐
                  │  Draft  │
                  └────┬────┘
                       │ AI Engine finishes baseline path
                       ▼
                  ┌──────────┐
                  │ Proposed │
                  └────┬─────┘
                       │ Learner confirms (creates ApprovalRecord)
                       ▼
                  ┌──────────┐
                  │ Approved │
                  └────┬─────┘
                       │ LearningSessionStarted
                       ▼
   ┌─────────┐    manual /     ┌─────────┐
   │ Paused  │ ◄── proposal ──►│ Active  │
   └────┬────┘    resolution   └───┬─┬─┬─┘
        │                          │ │ │
        │              all nodes   │ │ │
        │              completed   │ │ │
        ├──────────────────────────┼─┘ │
        │                          │   │ Goal change (Immutable trigger)
        │                          │   ▼
        │                          │ ┌────────────┐
        │                          │ │ Superseded │ (Terminal)
        │                          │ └────────────┘
        │                          ▼
        │                    ┌───────────┐
        │                    │ Completed │ (Terminal)
        │                    └───────────┘
        ▼
  ┌───────────┐
  │ Archived  │ (Terminal)
  └───────────┘
```

### 1.1 Draft
- **Description:** The roadmap structure is being initially assembled by the Roadmap Engine during the discovery phase. It is not yet visible to the learner.

### 1.2 Proposed
- **Description:** The generated roadmap structure is presented to the learner in the UI for review.

### 1.3 Approved
- **Description:** The learner has explicitly accepted the roadmap proposal, creating a permanent `ApprovalRecord`.
- **Attributes:** The roadmap is locked and ready for activation.

### 1.4 Active
- **Description:** The learner is actively pursuing the learning nodes on this roadmap.
- **Attributes:** Mapped 1:1 with an active `LearningSession`.

### 1.5 Completed (Terminal)
- **Description:** All milestone and learning nodes in the roadmap are in the `Completed` state.
- **Attributes:** Emits `RoadmapCompleted` event.

### 1.6 Superseded (Terminal)
- **Description:** The parent Goal was modified (Goal version $v_N \rightarrow v_{N+1}$), freezing this roadmap to preserve historical progress tracking context (DECISION-032).
- **Attributes:** Reads as read-only history. Linked session is archived.

### 1.7 Archived (Terminal)
- **Description:** The roadmap is manually archived without completion (e.g. learner cancels during onboarding or abandons path).

---

## 2. State Transition Matrix

The table below maps all valid source-to-target transitions, their triggers, and governance requirements:

| Source State | Target State | Trigger | Governance Check |
|---|---|---|---|
| **Draft** | **Proposed** | Roadmap Engine completes generation of nodes. | Verifies that all root node dependencies are validated. |
| **Proposed** | **Approved** | Learner clicks "Accept Roadmap" in UI. | **Mandatory:** Creates an `ApprovalRecord` linked to this transition. |
| **Proposed** | **Archived** | Learner clicks "Reject Roadmap" or cancels discovery. | Cancels the proposed onboarding flow. |
| **Approved** | **Active** | Learner starts the first session associated with the Goal. | Ensures the parent `Goal` is in `Active` status. |
| **Active** | **Completed** | All RoadmapNodes have status = `'Completed'`. | Triggers check of all KnowledgeNode Socratic mastery scores ($\ge 75\%$). |
| **Active** | **Superseded** | Parent Goal is superseded by a new version (DECISION-032). | Freezes the roadmap; triggers cloning onto a new roadmap record. |
| **Active** | **Archived** | Learner manually archives the parent Goal. | Transitions active session to Archived. |
| **Completed** | *Any* | **Invalid** | State is terminal. Reject any modification attempts. |
| **Superseded**| *Any* | **Invalid** | State is terminal. Reject any modification attempts. |
| **Archived**  | *Any* | **Invalid** | State is terminal. Reject any modification attempts. |

---

## 3. Governance and Transition Rules

### 3.1 The ApprovalRecord Lock (DECISION-006)
- **Rule:** The transition from `Proposed` to `Approved` **MUST** write an `ApprovalRecord` containing a checksum of the approved roadmap nodes and structure.
- **Enforcement:** The database schema enforces a foreign key constraint requiring an `approval_record_id` for approved roadmap transitions, or rejects the transaction if the record is missing.

### 3.2 Parent Goal State Sync
- **Rule:** A `Roadmap` state cannot contradict the state of its parent `Goal`.
- **Sync Invariant:**
  - If `Goal` transitions to `Superseded`, `Roadmap` **must** transition to `Superseded`.
  - If `Goal` transitions to `Archived`, `Roadmap` **must** transition to `Archived`.
  - If `Goal` transitions to `Completed`, `Roadmap` **must** transition to `Completed`.
- **Enforcement:** The domain service cascade-updates the roadmap state whenever a goal event is consumed.
