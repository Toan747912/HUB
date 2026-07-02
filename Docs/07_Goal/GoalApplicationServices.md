# Goal Application Services (WP-06)

- **Status:** Draft Architecture Design (Documentation Only)
- **Layer:** `goal/application`
- **Purpose:** Coordinate use-cases while preserving domain invariants

---

## 1. Service Layer Responsibilities

Application services in Goal module:

1. Receive commands/queries from interface layer.
2. Enforce authorization + ownership boundary checks.
3. Load and persist Goal aggregate state through abstraction.
4. Invoke aggregate behaviors and domain policies.
5. Publish domain events after successful state changes.
6. Return read models without leaking domain internals.

No application service performs roadmap/recommendation/assessment/learning-session/LLM operations.

---

## 2. Command-Oriented Services

## 2.1 GoalCommandService
Handles:
- CreateGoal
- UpdateGoal
- ArchiveGoal
- CompleteGoal

Flow:
1. validate command envelope
2. enforce ownership and actor policy
3. load/create aggregate
4. execute aggregate behavior
5. persist aggregate state
6. publish resulting domain events

## 2.2 GoalConstraintService
Handles:
- ChangeGoalConstraint

Flow:
1. fetch aggregate
2. validate constraint policy
3. apply change via aggregate
4. persist + publish `GoalConstraintChanged`

## 2.3 GoalMilestoneService
Handles:
- ReachGoalMilestone

Flow:
1. fetch aggregate
2. verify milestone relation and state
3. apply reach transition
4. update progress if needed
5. emit `GoalMilestoneReached` (+ optional `GoalCompleted` when criteria satisfied)

## 2.4 GoalProgressService
Handles:
- UpdateGoalProgress (policy-controlled)

Flow:
1. fetch aggregate
2. verify lifecycle allows progress update
3. apply progress update rules
4. persist and emit domain event if policy requires

---

## 3. Query-Oriented Services

## 3.1 GoalQueryService
Handles:
- GetGoal
- GetGoalHistory
- GetGoalProgress

Characteristics:
- read-only
- projection-friendly
- no domain mutation side effects

---

## 4. Cross-Cutting Application Policies

1. **Ownership Policy**
   - Reject mutation attempts outside Goal write boundary.

2. **Lifecycle Policy**
   - Enforce state machine transition validity.

3. **Versioning Policy**
   - Enforce append-only GoalVersion behavior.

4. **Concurrency Policy**
   - Detect and reject stale writes (optimistic concurrency concept).

5. **Idempotency Policy**
   - Safe retries for command processing.

6. **Audit Policy**
   - Ensure change intent and actor context are traceable.

---

## 5. Orchestration Layer Relation

`goal/orchestration` may coordinate multi-step internal workflows (e.g., command + event publication sequencing), but:
- must not bypass aggregate checks,
- must not call forbidden downstream business modules directly,
- must preserve Goal as source-of-truth for Goal state.

---

## 6. Error Semantics (Application-Level)

Typical errors raised/mapped:
- Goal not found
- invalid transition
- immutable version violation
- terminal state mutation forbidden
- ownership boundary violation
- concurrency conflict
- validation error

Application layer maps domain/application errors into interface contract error envelopes.

---

## 7. Non-Goals

Application services must not:
- generate roadmap artifacts
- create recommendation proposals
- perform assessments
- create/manage learning sessions
- execute LLM prompts
