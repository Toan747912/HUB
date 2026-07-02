# Session Hierarchy Model Specification

This document defines the structural rules, creation and closure boundaries, and cascading behaviors of the three-tier session model in the **AI Mentor OS** (DECISION-031).

---

## 1. Three-Tier Structure Overview

The interaction context is structured in three logical layers:

```
┌──────────────────────────────────────────────────────────────────┐
│ LearningSession (Aggregate Root)                                 │
│   "Build Backend API" (Spans Goal lifetime)                      │
│   │                                                              │
│   └── SubSession (Internal Entity)                               │
│         "JWT Authentication" (Spans RoadmapNode scope)            │
│         │                                                        │
│         └── MentorSession (External Reference)                   │
│               "Socratic Chat Turn" (Single interaction)          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Governance Rules

### 2.1 Ownership
- **LearningSession & SubSession:** Owned and managed transactionally by the **Learning Session Domain**.
- **MentorSession:** Owned and written exclusively by the **Mentor Interaction Domain** (Teaching Engine). The `SubSession` entity stores references (`mentor_session_refs[]`) but does not execute modifications to `MentorSession` fields.

### 2.2 Creation Rules
- **LearningSession:** Instantiated automatically when the Goal Domain fires `GoalDefined`.
- **SubSession:** Instantiated when the learner selects an Unlocked learning node in the UI. 
- **MentorSession:** Spawned dynamically by the Teaching Engine inside the active `SubSession` boundary to conduct Socratic conversation.

### 2.3 Closure Rules
- **MentorSession:** Closed when the conversation turn completes or when the active sub-session ends.
- **SubSession:** Closed and set to `Completed` when the Assessment Domain confirms concept mastery.
- **LearningSession:** Closed and set to `Completed` when the Roadmap Domain confirms all milestones are completed.

---

## 3. Cascading and Archival Behaviors

### 3.1 Cascading State Updates
- **Pause Cascade:** When a `LearningSession` transitions to `Paused` (DECISION-033):
  1. Any active child `SubSession` status is set to `Cancelled`.
  2. The linked active `MentorSession` transitions to `Expired`.
  3. Active conversational prompt generation is suspended.
- **Resume Cascade:** When the parent session transitions back to `Active`, the system creates a new `SubSession` for the target roadmap node.

### 3.2 Archival Behavior (DECISION-032)
When the parent Goal is modified:
1. The old Goal transitions to `Superseded`.
2. The active `LearningSession` transitions to `Archived`.
3. All active and planned sub-sessions are set to `Cancelled`.
4. This ensures that the historical progress logs of the old goal version are frozen and preserved for explainability audits, rather than being deleted or modified at runtime.
5. A new `LearningSession` is spawned for the new Goal version $v_{N+1}$.
