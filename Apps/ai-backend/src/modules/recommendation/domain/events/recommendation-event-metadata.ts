export type RecommendationEventMetadata = {
  eventId: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
  goalId: string;
  roadmapId: string;
  assessmentId: string;
  engineVersion: string;
};

export type RecommendationDomainEvent<TPayload = Record<string, unknown>> = {
  type:
    | 'RecommendationGenerated'
    | 'RecommendationApproved'
    | 'RecommendationRejected'
    | 'RecommendationArchived'
    | 'LearningStrategyChanged';
  metadata: RecommendationEventMetadata;
  payload: TPayload;
};
