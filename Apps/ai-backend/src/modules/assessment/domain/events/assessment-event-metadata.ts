export type AssessmentEventMetadata = {
  eventId: string;
  aggregateId: string;
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
  goalId: string;
  roadmapId: string;
  engineVersion: string;
};

export type AssessmentDomainEvent<TPayload = Record<string, unknown>> = {
  type:
    | 'AssessmentCreated'
    | 'AssessmentCompleted'
    | 'CompetencyUpdated'
    | 'KnowledgeGapDetected'
    | 'AssessmentArchived';
  metadata: AssessmentEventMetadata;
  payload: TPayload;
};
