import { AssessmentId, GoalId, RoadmapId } from '../../../../shared/domain/identifiers';

export type AssessmentEventMetadata = {
  eventId: string;
  aggregateId: AssessmentId;
  aggregateType: 'Assessment';
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
  goalId: GoalId;
  roadmapId: RoadmapId;
  engineVersion: string;
};

export type AssessmentDomainEvent<TPayload = Record<string, unknown>> = {
  type:
    | 'AssessmentCreated'
    | 'AssessmentCompleted'
    | 'CompetencyUpdated'
    | 'KnowledgeGapDetected'
    | 'AssessmentArchived'
    | 'AssessmentInvalidated';
  metadata: AssessmentEventMetadata;
  payload: TPayload;
};
