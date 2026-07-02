# Goal Aggregate Design (WP-06)

- **Status:** Draft Architecture Design (Documentation Only)
- **Aggregate Root:** Goal
- **Bounded Context:** Goal Module

---

## 1. Aggregate Intent

Goal aggregate enforces transactional consistency for:

- Goal
- GoalVersion
- GoalProgress
- GoalConstraint
- GoalMilestone

No external module may bypass this aggregate boundary for writes.

---

## 2. Aggregate Composition

```text
Goal (Aggregate Root)
├─ GoalVersion[*]      (append-only)
├─ GoalProgress        (current + historical projections)
├─ GoalConstraint[*]   (active/inactive constraints in version context)
└─ GoalMilestone[*]    (progress checkpoints)
```

---

## 3. Transactional Boundary Rules

1. Any command that changes goal state must load Goal aggregate and validate invariants.
2. GoalVersion append operation and active version switch occur in the same consistency boundary.
3. Milestone reached updates and progress recalculation are atomic under aggregate command handling.
4. Constraint modifications are atomic and emit `GoalConstraintChanged`.
5. Completion transition checks milestone/progress criteria before entering terminal state.

---

## 4. Versioning Model (Mandatory)

## 4.1 Append-Only Versioning

`GoalVersion` is strictly append-only:
- Never overwrite historical versions.
- New intent/scope changes create `v(n+1)`.
- Prior versions remain immutable for auditability and downstream reference integrity.

Example:

```text
Goal v1 -> Goal v2 -> Goal v3
```

Roadmap (future WP) can safely reference a specific GoalVersion without historical drift.

## 4.2 Version Consistency Rules

- Exactly one active version pointer at a time.
- Active version must belong to same Goal aggregate.
- Completed/Archived goals cannot append versions unless policy explicitly allows reopen via new Goal aggregate (not in current scope).

---

## 5. Lifecycle State Machine (Mandatory)

State model:

```text
Draft -> Active -> InProgress -> Completed
Draft -> Archived
Active -> Archived
InProgress -> Archived
```

Terminal states:
- `Completed`
- `Archived`

## 5.1 Allowed Transitions

| From | To | Notes |
|---|---|---|
| Draft | Active | Goal accepted and activated |
| Active | InProgress | Execution has started |
| InProgress | Completed | Completion criteria satisfied |
| Draft | Archived | Goal cancelled before activation |
| Active | Archived | Goal discontinued |
| InProgress | Archived | Goal stopped mid-execution |

## 5.2 Forbidden Transitions

- Completed -> any other state
- Archived -> any other state
- Direct Draft -> Completed
- Active -> Completed without required progress/milestones policy

All forbidden transitions must fail fast with domain error.

---

## 6. Invariants Enforced by Aggregate

1. **Aggregate Identity Invariant**
   - All nested entities belong to one `goalId`.

2. **Version Linearity Invariant**
   - Versions are monotonic (`v1 < v2 < v3`), no branching lineage.

3. **Milestone Membership Invariant**
   - Milestone belongs to valid version context and aggregate.

4. **Progress Bound Invariant**
   - Progress must remain within valid bounds and policy constraints.

5. **Constraint Validity Invariant**
   - Constraint set must remain non-contradictory under domain policy.

6. **Terminal Freeze Invariant**
   - No mutable operations allowed in terminal states.

---

## 7. Aggregate Commands (Conceptual)

- CreateGoal
- UpdateGoal (metadata/intent refinement with version policy)
- ArchiveGoal
- CompleteGoal
- ChangeGoalConstraint
- ReachGoalMilestone
- UpdateGoalProgress

All commands pass through application service orchestration but are validated by aggregate rules.

---

## 8. Concurrency and Consistency

- Aggregate version token (conceptual) guards concurrent updates.
- Event publication is based on successful state mutation only.
- Idempotency expected for retry-safe command processing at application layer.

---

## 9. Boundary Protections

Goal aggregate does not invoke downstream module logic directly:
- No Roadmap generation
- No Assessment execution
- No Recommendation generation
- No Learning Session creation
- No LLM invocation

Cross-module actions occur only via published events and asynchronous reactions.
