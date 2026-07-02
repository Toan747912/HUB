# Goal Domain Model (WP-06)

- **Status:** Draft Architecture Design (Documentation Only)
- **Module:** Goal
- **Architecture Style:** Clean Architecture
- **Write Owner:** Goal Module
- **Scope:** Goal, GoalVersion, GoalProgress, GoalConstraint, GoalMilestone

---

## 1. Purpose

Goal Module defines, evolves, and tracks learner goals as a protected domain boundary.  
It is the **single write owner** for all goal state transitions and goal-related consistency rules.

This module does **not** generate roadmaps, recommendations, assessments, learning sessions, or call LLM runtimes.

---

## 2. Clean Architecture Placement

```text
goal/
├─ application
├─ domain
├─ infrastructure
├─ interface
└─ orchestration
```

- **domain:** core entities, value objects, invariants, domain policies, domain events
- **application:** use-case coordination, command handling, transaction boundaries
- **infrastructure:** persistence/event adapters (implementation detail)
- **interface:** external API surface (contracts only in this phase)
- **orchestration:** workflow-level sequencing and event choreography without breaking boundaries

---

## 3. Ubiquitous Language

- **Goal:** learner intention boundary and aggregate root.
- **GoalVersion:** immutable snapshot revision of a goal definition.
- **GoalProgress:** measured progress state under a specific goal version.
- **GoalConstraint:** explicit learner/system constraints applied to execution.
- **GoalMilestone:** meaningful checkpoint toward completion.
- **Write Owner:** module authorized to mutate state.
- **Append-only Versioning:** history is never overwritten, only extended.

---

## 4. Aggregate Root

## `Goal` (Aggregate Root)

All writes to GoalVersion, GoalProgress, GoalConstraint, GoalMilestone are consistency-governed via Goal aggregate boundary.

### Aggregate Identity
- `goalId` (stable aggregate identity)
- `learnerId` (owner learner)

### Aggregate State (logical)
- goal metadata (title/intent/type/difficulty/priority/targetDate)
- lifecycle state (Draft, Active, InProgress, Completed, Archived)
- activeVersion pointer
- constraints collection
- milestones collection
- progress model

---

## 5. Entities

## 5.1 Goal
- Root identity and lifecycle authority
- Owns transitions and guards invariants
- Emits domain events for state changes

## 5.2 GoalVersion
- Immutable snapshot of goal definition
- Append-only sequence (`v1`, `v2`, `v3`, …)
- Version lineage maintained by aggregate

## 5.3 GoalProgress
- Progress metrics associated with goal/version context
- Tracks completion ratio, milestone attainment, trend markers
- Updated only through Goal aggregate commands

## 5.4 GoalConstraint
- Captures constraints (time, scope, prerequisite, deadline pressure, etc.)
- Constraint changes are explicit state changes with event output

## 5.5 GoalMilestone
- Atomic checkpoints for progress decomposition
- May be pending, reached, or superseded by newer version context
- Milestone completion can drive lifecycle transitions

---

## 6. Value Objects

Mandatory value objects in Goal domain:

- **GoalPriority**
- **GoalStatus**
- **GoalType**
- **GoalDifficulty**
- **TargetDate**

Value objects are immutable, validation-rich, and free of persistence concerns.

---

## 7. Lifecycle Model (Domain-Level)

Primary lifecycle used by aggregate policies:

```text
Draft -> Active -> InProgress -> Completed
Draft -> Archived
Active -> Archived
InProgress -> Archived
```

Terminal states:
- `Completed`
- `Archived`

Rules:
1. Terminal states cannot transition to non-terminal states.
2. Progress updates are forbidden after terminal state.
3. Constraint and milestone modifications are forbidden after terminal state unless explicitly versioned into a new GoalVersion.

---

## 8. Core Invariants

1. **Write Ownership Invariant**
   - Only Goal module may mutate Goal aggregate state.

2. **Version Immutability Invariant**
   - GoalVersion is append-only; historical versions are immutable.

3. **Lifecycle Integrity Invariant**
   - Only valid transitions allowed by state machine.

4. **Milestone Consistency Invariant**
   - Milestone must belong to same goal aggregate and valid version context.

5. **Constraint Consistency Invariant**
   - Constraint changes must preserve aggregate validity and emit corresponding event.

6. **Progress Integrity Invariant**
   - Progress must be monotonic-safe under policy (cannot exceed completion bounds, cannot regress silently without explicit policy/event).

---

## 9. Domain Events (Required Set)

- `GoalCreated`
- `GoalUpdated`
- `GoalArchived`
- `GoalCompleted`
- `GoalConstraintChanged`
- `GoalMilestoneReached`

These are canonical Goal domain events and are published by Goal module as source-of-truth.

---

## 10. Module Boundary and Non-Goals

Goal module must **not**:
- Generate Roadmaps
- Create Recommendations
- Run Assessments
- Create Learning Sessions
- Call LLMs

Goal module may publish domain events for downstream consumers to react asynchronously within their own bounded contexts.

---

## 11. Ownership Principle

- Goal module = **WRITE OWNER**
- Other modules = **READ ONLY**
- No external module may directly update Goal/GoalVersion/GoalProgress/GoalConstraint/GoalMilestone state.
