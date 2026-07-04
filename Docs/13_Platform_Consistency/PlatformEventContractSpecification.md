# Platform Event Contract Specification

**Batch:** WP-06C — Platform Standardization & Hardening  
**Status:** Canonical & Deployed  
**Owning Module:** `src/infrastructure/outbox/`  

---

## 1. Domain Event Envelope Format

Every module in the platform publishes domain events using a standardized envelope. The contract is defined in [domain-event.contract.ts](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/infrastructure/outbox/domain-event.contract.ts):

```typescript
export interface DomainEventMetadata {
  eventId: string;
  aggregateId: { toString(): string };
  aggregateType: string;
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
  [key: string]: unknown; // Allow module-specific metadata extensions
}

export interface DomainEvent<
  AggregateType extends string = string,
  PayloadType = unknown
> {
  type: string;
  metadata: DomainEventMetadata;
  payload: PayloadType;
}
```

---

## 2. Metadata Preservation (Outbox & Queue Relay)

A major inconsistency in WP-06B was the loss of causal tracing during asynchronous outbox relay (e.g. correlation and causation IDs were discarded on save, then fabricated as the event's own ID on retry). 

To ensure end-to-end trace preservation, we implemented the following lifecycle:

```
 [ Domain Aggregate ] (Appends traceId / correlationId / causationId)
         │
         ▼  (Persists full metadata set)
  [ outbox_events ]  (Mongoose Schema: traceId, correlationId, causationId, aggregateType)
         │
         ▼  (Outbox sweep / sweep interval)
[ OutboxRelayService ] (Reconstructs branded ID using aggregateType, preserves IDs)
         │
         ▼  (Enqueues job)
   [ QueueService ]  (Redis / BullMQ payload)
         │
         ▼  (Processes in-process event handler)
[ OrchestrationWorker ] (Invokes downstream command, passing on traceId / correlationId)
```

1. **Persistence:** [OutboxEventSchema](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/infrastructure/outbox/outbox-event.schema.ts) includes columns specifically for trace tracking:
   - `traceId`, `correlationId`, `causationId`
   - `aggregateType` (used to rebuild the correct branded ID during relay)
2. **Relay:** [OutboxRelayService](file:///e:/Users/ngoqu/LapTrinh/web/HUB/Apps/ai-backend/src/infrastructure/outbox/outbox-relay.service.ts) maps records directly to the domain event, ensuring no IDs are regenerated or lost:
   ```typescript
   const metadata: DomainEventMetadata = {
     eventId: doc.eventId,
     aggregateId: reconstructAggregateId(doc.aggregateType, doc.aggregateId),
     aggregateType: doc.aggregateType,
     aggregateVersion: doc.aggregateVersion,
     occurredAt: doc.occurredAt.toISOString(),
     traceId: doc.traceId,
     correlationId: doc.correlationId,
     causationId: doc.causationId,
     ...doc.metadata
   };
   ```

---

## 3. Standardized Event Catalog

The following catalog defines the canonical domain event names implemented in the codebase. Legacy naming models in documentation (e.g., `GoalDefined` or `RecommendationProposed`) have been synchronized with the actual as-built names:

### Implemented Core Events

| Owning Module | Event Name | Trigger |
|---|---|---|
| **Goal** | `GoalCreated` | A new learning goal is registered. |
| | `GoalUpdated` | Goal properties (title, difficulty, status) change. |
| | `GoalCompleted` | Goal milestones are completed and progress reaches 100%. |
| | `GoalArchived` | The goal is manually archived/canceled. |
| **Roadmap** | `RoadmapCreated` | A new roadmap is successfully generated. |
| | `RoadmapUpdated` | Roadmap properties (status, metadata) update. |
| | `RoadmapPublished` | Roadmap is published for learner consumption. |
| | `RoadmapRegenerated` | Roadmap is rebuilt to update learning milestones. |
| | `RoadmapInvalidated` | Roadmap is flagged stale due to upstream changes. |
| | `RoadmapArchived` | Roadmap is archived. |
| **Assessment** | `AssessmentCreated` | A new competency assessment process begins. |
| | `AssessmentCompleted` | Learner completes questions and scores are evaluated. |
| | `CompetencyUpdated` | Evaluated competencies update from fresh input. |
| | `KnowledgeGapDetected` | A new knowledge gap is identified based on score regressions. |
| | `AssessmentInvalidated` | Assessment is flagged stale due to upstream changes. |
| **Recommendation**| `RecommendationGenerated`| A set of recommended resources is generated. |
| | `RecommendationApproved` | Learner accepts proposed recommendation changes. |
| | `RecommendationInvalidated`| Recommendations are flagged stale due to upstream changes. |

### Unimplemented Stub Events
Events belonging to the following modules are documented as **Not Yet Implemented** at the code level, as these modules are still stubs (empty skeletons or mock services):
- **Discovery** (e.g. `DiscoverySessionStarted`, `DiscoverySessionEnded`)
- **Evidence** (e.g. `EvidenceSubmitted`, `EvidenceVerified`)
- **Knowledge** (e.g. `KnowledgeNodeMapped`, `ConceptLinkCreated`)
- **Learning Session** (e.g. `SessionInitialized`, `SessionInterrupted`)
- **Teaching** (e.g. `TeachingOutcomeLogged`, `ConceptExplained`)
