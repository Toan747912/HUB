import { GoalId, RoadmapId } from '../../../../shared/domain/identifiers';

export type RoadmapEventMetadata = {
  eventId: string;
  aggregateId: RoadmapId;
  aggregateType: 'Roadmap';
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
  goalId: GoalId;
  plannerVersion: string;
};

export type RoadmapDomainEvent<TPayload = Record<string, unknown>> = {
  type:
    | 'RoadmapCreated'
    | 'RoadmapUpdated'
    | 'RoadmapPublished'
    | 'RoadmapArchived'
    | 'RoadmapCompleted'
    | 'RoadmapRegenerated';
  metadata: RoadmapEventMetadata;
  payload: TPayload;
};
