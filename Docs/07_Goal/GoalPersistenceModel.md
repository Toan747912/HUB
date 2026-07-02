# Goal Persistence Model (WP-06)

- **Status:** Draft Architecture Design (Documentation Only)
- **Important:** Logical persistence model only (no SQL, no migration scripts)

---

## 1. Persistence Principles

1. Persistence must preserve Goal aggregate invariants.
2. GoalVersion history is append-only and immutable.
3. Lifecycle transitions are auditable and reconstructable.
4. Read-model optimization must not violate write ownership.
5. Storage model is implementation-agnostic in this phase.

---

## 2. Logical Storage Components

## 2.1 Goal Store
Logical responsibility:
- one record per Goal aggregate identity
- contains stable identity + current lifecycle + active version pointer

Typical logical fields:
- goalId
- learnerId
- status (GoalStatus)
- activeVersionNumber
- createdAt / updatedAt
- archivedAt / completedAt (if terminal)

## 2.2 GoalVersion Store
Logical responsibility:
- append-only immutable version history

Typical logical fields:
- goalId
- versionNumber
- goalType
- goalDifficulty
- goalPriority
- targetDate
- versionPayload (semantic definition snapshot)
- createdAt
- createdBy

Constraints:
- unique (goalId, versionNumber)
- no update-in-place for immutable fields

## 2.3 GoalProgress Store
Logical responsibility:
- progress snapshots and progression markers by goal/version

Typical logical fields:
- goalId
- versionNumber (or active logical context)
- completionRatio
- progressState
- calculatedAt
- progressReason

## 2.4 GoalConstraint Store
Logical responsibility:
- constraints attached to goal lifecycle/version context

Typical logical fields:
- goalId
- constraintId
- constraintType
- constraintValue
- isActive
- effectiveFrom / effectiveTo

## 2.5 GoalMilestone Store
Logical responsibility:
- milestone decomposition and achievement history

Typical logical fields:
- goalId
- milestoneId
- versionNumber
- milestoneName
- milestoneStatus
- reachedAt

---

## 3. Event Persistence (Outbox-Compatible Concept)

Goal domain events should be durably recorded for reliable publication.

Logical event record:
- eventId
- aggregateId (goalId)
- aggregateVersion
- eventType
- eventPayload
- occurredAt
- traceId
- correlationId
- causationId
- publishStatus

This supports reliable asynchronous distribution without coupling write transaction to external transport behavior.

---

## 4. Auditability Requirements

Audit timeline must reconstruct:
- who changed goal state
- when transition occurred
- what version was active
- why change happened (reason context where applicable)
- which event was emitted

History reconstruction must be possible without mutating historical data.

---

## 5. Consistency Patterns

1. **Write consistency**
   - Goal aggregate mutation and version append are consistency-guarded.

2. **Projection consistency**
   - Read projections may be eventually consistent from domain events.

3. **Concurrency consistency**
   - aggregateVersion or equivalent mechanism prevents lost updates.

---

## 6. Data Retention and Immutability

- GoalVersion records are immutable and retained for traceability.
- Terminal goal records are retained for historical analytics.
- Constraint/milestone histories should preserve transition lineage.

---

## 7. Boundary Alignment

Persistence model must not expose direct write channels to external modules.
All mutations occur through Goal module application services and aggregate logic only.

---

## 8. Non-Goals

This document intentionally excludes:
- SQL DDL
- migration plans
- engine-specific indexing syntax
- repository class/interface implementation
- ORM mapping details
