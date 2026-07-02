import { Identifier } from '../../shared/domain/identifiers';

/**
 * Common metadata fields every module's per-aggregate event-metadata type
 * carries (GoalEventMetadata, RoadmapEventMetadata, AssessmentEventMetadata,
 * RecommendationEventMetadata). Each module's own metadata type is a
 * structural superset of this (it adds module-specific fields such as
 * `goalId`/`plannerVersion`), so those types are assignable to
 * `DomainEventMetadata` without a cast.
 */
export interface DomainEventMetadata {
  eventId: string;
  aggregateId: Identifier<string>;
  aggregateType: string;
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
}

/**
 * Generic shape shared by every module's domain-event union
 * (GoalDomainEvent, RoadmapDomainEvent, AssessmentDomainEvent,
 * RecommendationDomainEvent). Infra components that don't need to know the
 * exact per-module union (OutboxRepository, OutboxPublisherService,
 * OutboxRelayService, QueueService) should depend on this instead of a
 * specific module's event type — a normal (non-lossy) upcast to this shape
 * is always safe since it only reads fields, never narrows on `type`.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  type: TType;
  metadata: DomainEventMetadata;
  payload: TPayload;
}
