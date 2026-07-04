# User Journey & Adaptive Loop Validation

This document tracks how a learner completes the adaptive loop inside **Memento OS**.

## Closed-Loop Execution Pathway

```mermaid
sequenceDiagram
  autonumber
  actor Learner
  participant Dashboard
  participant Goals
  participant Workspace
  participant Assessment
  
  Learner->>Goals: Set active Study Goal & target date
  Note over Goals: Client generates unique IDs & initializes initial Roadmap
  Learner->>Dashboard: Browse daily Recommendations
  Learner->>Dashboard: Approve Recommended Pathway adjustments
  Learner->>Workspace: Launch Study Session (Timer starts)
  Learner->>Workspace: Log Study Evidence telemetry (delta + type)
  Note over Workspace: Telemetry writes directly to MongoDB outbox
  Learner->>Assessment: Launch Quiz/Evaluation check
  Note over Assessment: Re-evaluates mastery values and updates Radar chart
```

## Step-by-Step Experience Guide

1. **Setting the Target**:
   - The learner defines a goal (e.g., "Outbox Pattern Hardening").
   - The client immediately provisions a roadmap outline containing milestones and task checklists.

2. **Studying & Logging Evidence**:
   - The learner launches the workspace session. A countdown timer keeps them focused.
   - When a practice milestone is hit, the learner presses "Log Study Evidence" to send a verified telemetry signal (e.g., +3 confidence points on concurrency locks).

3. **Verifying Readiness**:
   - The learner opens the Assessment Center and completes a competency verification check.
   - Their profile is updated, knowledge gaps are resolved, and the updated confidence radar chart provides immediate visual feedback.
