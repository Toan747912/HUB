import { AssessmentId, GoalId, RecommendationId, RoadmapId } from '../../../../shared/domain/identifiers';

export type RecommendationEventMetadata = {
  eventId: string;
  aggregateId: RecommendationId;
  aggregateType: 'Recommendation';
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
  goalId: GoalId;
  roadmapId: RoadmapId;
  assessmentId: AssessmentId;
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
