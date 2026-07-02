# Session Orchestration Model Specification

This document defines how the **Learning Session Domain** coordinates and routes traffic across the five core AI capability engines to conduct learning pathways.

---

## 1. Engine Coordination Architecture

The Learning Session Domain acts as the central **Orchestrator**, routing state transitions without holding write access to the secondary engine contexts.

```
       Discovery Engine          Roadmap Engine           Teaching Engine
      (Goal & onboarding)      (Branch expansion)       (Socratic turns)
               │                        │                       │
               └───────────┬────────────┘                       │
                           ▼                                    ▼
                 ┌────────────────────────────────────────────────┐
                 │           Learning Session Domain              │
                 │                 (Orchestrator)                 │
                 └────────────────────────────────────────────────┘
                           ▲                                    ▲
                           │                                    │
               ┌───────────┴────────────┐                       │
               ▼                        ▼                       ▼
       Evidence Engine          Assessment Engine        Recommendation Engine
      (Positive/Negative)      (Mastery calculation)    (Path correction proposals)
```

---

## 2. Trigger Matrix and Ordering Rules

The orchestrator chains capabilities sequentially according to the following trigger matrix:

| Event | Source Engine / Domain | Orchestrator Action | Target Engine / Domain |
|---|---|---|---|
| `DiscoverySessionCompleted` | Discovery Engine | Reads competency signals; requests roadmap baseline generation. | Roadmap Engine |
| `RoadmapApproved` | Goal & Roadmap | Triggers `LearningSessionStarted` event; sets focus to first leaf node. | Learning Session |
| `SubSessionStarted` | Learning Session | Initializes the interaction turn context. | Teaching Engine (`/initiate`) |
| `UserTurnSubmitted` | Learner UI | Captures raw response text; forwards to teaching parser. | Teaching Engine (`/interaction/turn`) |
| `EvidenceRecorded` | Evidence Engine | Forwards positive/negative evidence links to update mastery scores. | Assessment Engine |
| `MasteryLevelAchieved` | Assessment Engine | Triggers leaf node re-evaluation check. | Roadmap Domain |
| `RoadmapNodeCompleted` | Roadmap Domain | Triggers next node unlocking check. If unexpanded, requests expansion proposal. | Recommendation Engine |

---

## 3. Escalation and Blocked State Handling

### 3.1 Intervention Escalation Rules
If the learner encounters difficulty (Stuck Detection Model), the session domain coordinates the **Intervention Ladder**:
1. **Tier 1 (Hint):** Teaching Engine intercepts turn, outputting a subtle Socratic clue.
2. **Tier 2 (Guided Walkthrough):** If failures continue, Teaching Engine outputs a structured step-by-step tutorial.
3. **Tier 3 (Recommendation Proposal):** If the learner remains stuck, the session domain flags a **Blocked State**.

### 3.2 Blocked State Resolution
When a Blocked State is declared (e.g. learner repeatedly fails a milestone assessment):
- **Lockout:** Normal Socratic conversation turns in the active `SubSession` are locked.
- **Trigger:** The orchestrator calls the **Recommendation Engine** to generate a path correction proposal:
  - Adds a simplified sub-goal (Micro-Goal).
  - Or swaps the concept node with a simpler prerequisite.
- **Resolution:** The learner reviews and approves the recommendation (`ApprovalRecord` created), updating the roadmap, unlocking the Blocked State, and resuming normal study.
