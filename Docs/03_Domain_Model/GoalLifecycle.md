# Goal Lifecycle Specification

This document maps the state transitions, allowed triggers, terminal states, invalid transitions, and governance checks for the `Goal` Aggregate Root in the **AI Mentor OS**.

---

## 1. State Space Definitions

The lifecycle of a `Goal` consists of six distinct states:

```
                  ┌─────────┐
                  │  Draft  │
                  └────┬────┘
                       │ Learner confirms goal (GoalDefined)
                       ▼
   ┌─────────┐    manual /     ┌─────────┐
   │ Paused  │ ◄── proposal ──►│ Active  │
   └────┬────┘    resolution   └───┬─┬─┬─┘
        │                          │ │ │
        │              all nodes   │ │ │
        │              completed   │ │ │
        ├──────────────────────────┼─┘ │
        │                          │   │ Goal changed (Immutable trigger)
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
- **Description:** The goal statement is undergoing discovery (clarification/refinement) in a `DiscoverySession`. 
- **Attributes:** Mapped roadmap structure does not exist yet.

### 1.2 Active
- **Description:** The learner is actively pursuing this goal.
- **Attributes:** Connected to an active `Roadmap` and an active `LearningSession`.

### 1.3 Paused
- **Description:** Active study is suspended.
- **Attributes:** Connected `LearningSession` state is set to `Paused` (DECISION-033). No evidence collections occur in this state.

### 1.4 Completed (Terminal)
- **Description:** All learning milestones and Socratic mastery thresholds for the goal have been met.
- **Attributes:** The connected `LearningSession` state is set to `Completed`.

### 1.5 Superseded (Terminal)
- **Description:** The learner changed their goal or adjusted the statement/scope mid-way. The goal is frozen to preserve historical evidence (DECISION-032).
- **Attributes:** Linked `LearningSession` is set to `Archived`. References `superseded_by_goal_id` pointing to the new version.

### 1.6 Archived (Terminal)
- **Description:** The goal is manually archived by the user without completing the roadmap.
- **Attributes:** Connected `LearningSession` is moved to `Archived`.

---

## 2. State Transition Matrix

The table below maps all valid source-to-target transitions, their triggers, and governance requirements:

| Source State | Target State | Trigger | Governance Check |
|---|---|---|---|
| **Draft** | **Active** | Learner approves the goal statement and initial roadmap proposal. | Enforces that no other goal for this Learner is currently `Active`. |
| **Draft** | **Archived** | Learner cancels the onboarding discovery session. | No roadmap is created. |
| **Active** | **Paused** | Learner manually pauses, or confirms a Recommendation Proposal to pause (DECISION-033). | Suspends active notifications and timers. |
| **Active** | **Completed** | Assessment Domain confirms that all RoadmapNode requirements meet the $\ge 75\%$ mastery threshold. | Emits `GoalCompleted` and requests feedback. |
| **Active** | **Superseded** | Learner modifies the goal scope, initiating the immutable replacement chain (DECISION-032). | Instantiates the new Goal version and triggers new `LearningSession` creation. |
| **Active** | **Archived** | Learner manually archives the goal to start another. | Archives the active `LearningSession`. |
| **Paused** | **Active** | Learner manually resumes study, or confirms a resume recommendation. | Enforces single-active check. Resumes connected session. |
| **Paused** | **Superseded** | Learner modifies the paused goal, initiating replacement. | Instantiates the new Goal version. |
| **Paused** | **Archived** | Learner manually archives the paused goal. | Archives the paused session. |
| **Completed** | *Any* | **Invalid** | State is terminal. Reject any modification attempts. |
| **Superseded**| *Any* | **Invalid** | State is terminal. Reject any modification attempts. |
| **Archived**  | *Any* | **Invalid** | State is terminal. Reject any modification attempts. |

---

## 3. Governance and Transition Rules

### 3.1 Strict Terminal Rule
Once a Goal enters `Completed`, `Superseded`, or `Archived`, it can **never** leave that state. Database triggers or constraint blocks must raise an error for any update statement attempting to mutate the status of a terminal record.

### 3.2 Single-Active Verification
Before executing any transition that outputs to the `Active` state (i.e. `Draft ➔ Active` or `Paused ➔ Active`), the domain service must check:
$$\sum \text{Goals}(\text{learner\_id} = L, \text{state} = \text{'Active'}) = 0$$
If this invariant is violated, the transition is blocked. The existing active goal must be manually paused, archived, or completed first.

### 3.3 State Synchronization with LearningSession
The Goal state controls the parent orchestration session (`LearningSession`):
- `Goal: Active` ➔ `LearningSession: Active`
- `Goal: Paused` ➔ `LearningSession: Paused`
- `Goal: Completed` ➔ `LearningSession: Completed`
- `Goal: Superseded` / `Goal: Archived` ➔ `LearningSession: Archived`
These transitions are triggered automatically by the `Learning Session Domain` listening to Goal Domain Events.
