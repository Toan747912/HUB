# Goal API Contract (WP-06)

- **Status:** Draft Architecture Contract (Documentation Only)
- **Scope:** Goal module public boundary
- **Important:** No DTO/code definitions in this phase

---

## 1. Design Principles

1. Goal API is the only write gateway to Goal state.
2. Commands mutate state through aggregate rules.
3. Queries are read-only and never mutate state.
4. Events are emitted by Goal domain after successful command execution.
5. Errors are explicit, structured, and boundary-aware.

---

## 2. Commands

## 2.1 CreateGoal
Purpose:
- Create a new Goal aggregate in `Draft` (or `Active` if policy allows).

Intent fields:
- learner reference
- goal intent definition
- GoalType
- GoalDifficulty
- GoalPriority
- TargetDate
- optional initial constraints
- optional initial milestones

Success outcomes:
- Goal created
- GoalCreated event emitted

---

## 2.2 UpdateGoal
Purpose:
- Update goal metadata or evolve intent under versioning policy.

Rules:
- If change affects immutable versioned definition, append new GoalVersion.
- Do not overwrite historical GoalVersion.

Success outcomes:
- Goal updated / new version appended
- GoalUpdated event emitted

---

## 2.3 ArchiveGoal
Purpose:
- Transition Goal to `Archived` terminal state.

Rules:
- Allowed from Draft/Active/InProgress only.
- Forbidden from Completed/Archived.

Success outcomes:
- Goal archived
- GoalArchived event emitted

---

## 2.4 CompleteGoal
Purpose:
- Transition Goal to `Completed` terminal state.

Rules:
- Completion criteria must pass (progress + milestone policy).
- Terminal freeze applies after completion.

Success outcomes:
- Goal completed
- GoalCompleted event emitted

---

## 2.5 ChangeGoalConstraint
Purpose:
- Add/update/remove constraint within aggregate boundary.

Rules:
- Must validate constraint policy consistency.
- Forbidden in terminal state unless explicit policy extension.

Success outcomes:
- Constraint set updated
- GoalConstraintChanged event emitted

---

## 2.6 ReachGoalMilestone
Purpose:
- Mark milestone as reached.

Rules:
- Milestone must belong to goal and valid version context.
- Can trigger progress recalculation and completion check.

Success outcomes:
- milestone updated
- GoalMilestoneReached event emitted

---

## 3. Queries

## 3.1 GetGoal
Returns:
- goal identity
- lifecycle state
- active version reference
- summary progress
- constraints summary
- milestones summary

---

## 3.2 GetGoalHistory
Returns:
- ordered GoalVersion chain (append-only history)
- lifecycle transition history
- major event references

---

## 3.3 GetGoalProgress
Returns:
- progress summary
- per-milestone status
- completion readiness indicators

---

## 4. Events (Published by Goal)

- GoalCreated
- GoalUpdated
- GoalArchived
- GoalCompleted
- GoalConstraintChanged
- GoalMilestoneReached

Each event must include metadata:
- eventId
- aggregateId
- aggregateVersion
- occurredAt
- traceId
- correlationId
- causationId

---

## 5. Error Model

Standard error envelope (conceptual):
- errorCode
- message
- details
- correlationId
- timestamp

Common error codes:
- `GOAL_NOT_FOUND`
- `INVALID_STATE_TRANSITION`
- `GOAL_TERMINAL_STATE_MUTATION_FORBIDDEN`
- `GOAL_VERSION_IMMUTABILITY_VIOLATION`
- `GOAL_CONSTRAINT_POLICY_VIOLATION`
- `GOAL_MILESTONE_POLICY_VIOLATION`
- `OWNERSHIP_BOUNDARY_VIOLATION`
- `VALIDATION_ERROR`
- `CONCURRENCY_CONFLICT`

---

## 6. Boundary Rules

API must reject any request that attempts:
- direct persistence-level patch semantics
- bypassing aggregate invariants
- mutation by non-owner module context

---

## 7. Non-Goals in API Surface

Goal API does not expose:
- roadmap generation commands
- recommendation generation commands
- assessment execution commands
- learning session creation commands
- LLM invocation commands
