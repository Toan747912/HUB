export type RoadmapEventMetadata = {
  eventId: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
  goalId: string;
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
