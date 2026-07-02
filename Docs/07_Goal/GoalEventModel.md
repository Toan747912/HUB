# Goal Event Model (WP-06)

- **Status:** Draft Architecture Design (Documentation Only)
- **Event Source of Truth:** Goal Module
- **Event Style:** Domain Events (integration-capable)

---

## 1. Canonical Goal Events

Required events:

1. `GoalCreated`
2. `GoalUpdated`
3. `GoalArchived`
4. `GoalCompleted`
5. `GoalConstraintChanged`
6. `GoalMilestoneReached`

These events are emitted only by Goal module after successful aggregate state transition.

---

## 2. Event Metadata Contract (Mandatory)

Every Goal event must include:

- `eventId`
- `aggregateId`
- `aggregateVersion`
- `occurredAt`
- `traceId`
- `correlationId`
- `causationId`

### Metadata Semantics

- **eventId:** globally unique event identity.
- **aggregateId:** `goalId`.
- **aggregateVersion:** post-change aggregate version for ordering/concurrency validation.
- **occurredAt:** UTC timestamp of domain occurrence.
- **traceId:** distributed trace context.
- **correlationId:** links events belonging to same business flow.
- **causationId:** command/event ID that directly triggered this event.

---

## 3. Event Envelope (Conceptual)

```text
{
  metadata: {
    eventId,
    aggregateId,
    aggregateVersion,
    occurredAt,
    traceId,
    correlationId,
    causationId
  },
  payload: {
    ...domain-specific fields...
  }
}
```

No transport-specific schema is mandated in this design phase.

---

## 4. Event Payload Intent

## 4.1 GoalCreated
Emitted when new Goal aggregate is created.
Payload intent:
- learner identity reference
- initial status
- initial version reference
- goal type/difficulty/priority/target date context

## 4.2 GoalUpdated
Emitted when goal metadata or active version context changes under policy.
Payload intent:
- changed fields summary
- version transition info (if any)
- reason context

## 4.3 GoalArchived
Emitted when goal enters Archived terminal state.
Payload intent:
- previous status
- archive reason
- terminal state timestamp

## 4.4 GoalCompleted
Emitted when completion criteria are satisfied.
Payload intent:
- completion summary
- milestone/progress completion snapshot
- completion timestamp

## 4.5 GoalConstraintChanged
Emitted when constraints are added/updated/removed.
Payload intent:
- changed constraint identity/type
- before/after semantic summary
- policy reason

## 4.6 GoalMilestoneReached
Emitted when a milestone changes to reached.
Payload intent:
- milestone identity
- reached timestamp
- progress impact summary

---

## 5. Ordering and Idempotency

1. **Per-aggregate ordering**
   - Consumers process events by (`aggregateId`, `aggregateVersion`) order.

2. **At-least-once safety**
   - Consumers must treat `eventId` as idempotency key.

3. **Gap detection**
   - If aggregateVersion jumps unexpectedly, consumer should mark stream as out-of-sync and trigger reconciliation flow.

---

## 6. Publication Rules

- Event emitted only after aggregate commit success.
- No event emission for rejected/failed domain transitions.
- Metadata population is mandatory; incomplete metadata invalidates publication.

---

## 7. Consumer Expectations (Read-only Influence)

Downstream modules may consume Goal events **read-only** to update their own projections/workflows.
They must not mutate Goal state directly.

---

## 8. Forbidden Event Coupling

Goal events must not encode executable instructions for:
- roadmap generation
- recommendation synthesis
- assessment execution
- learning session creation
- AI runtime invocation

Goal module emits facts, not remote commands to violate bounded contexts.
