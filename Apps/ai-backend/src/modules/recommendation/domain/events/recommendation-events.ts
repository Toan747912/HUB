import { RecommendationDomainEvent, RecommendationEventMetadata } from './recommendation-event-metadata';

export type RecommendationGeneratedPayload = {
  goalId: string;
  roadmapId: string;
  assessmentId: string;
  itemCount: number;
  averageConfidence: number;
};

export type RecommendationApprovedPayload = {
  previousStatus: string;
};

export type RecommendationRejectedPayload = {
  previousStatus: string;
  reason?: string;
};

export type RecommendationArchivedPayload = {
  previousStatus: string;
};

export type LearningStrategyChangedPayload = {
  strategies: { skillArea: string; strategy: string; rationale: string }[];
};

export type RecommendationInvalidatedPayload = {
  reason: string;
};

export const recommendationGeneratedEvent = (
  metadata: RecommendationEventMetadata,
  payload: RecommendationGeneratedPayload
): RecommendationDomainEvent<RecommendationGeneratedPayload> => ({
  type: 'RecommendationGenerated',
  metadata,
  payload
});

export const recommendationApprovedEvent = (
  metadata: RecommendationEventMetadata,
  payload: RecommendationApprovedPayload
): RecommendationDomainEvent<RecommendationApprovedPayload> => ({
  type: 'RecommendationApproved',
  metadata,
  payload
});

export const recommendationRejectedEvent = (
  metadata: RecommendationEventMetadata,
  payload: RecommendationRejectedPayload
): RecommendationDomainEvent<RecommendationRejectedPayload> => ({
  type: 'RecommendationRejected',
  metadata,
  payload
});

export const recommendationArchivedEvent = (
  metadata: RecommendationEventMetadata,
  payload: RecommendationArchivedPayload
): RecommendationDomainEvent<RecommendationArchivedPayload> => ({
  type: 'RecommendationArchived',
  metadata,
  payload
});

export const learningStrategyChangedEvent = (
  metadata: RecommendationEventMetadata,
  payload: LearningStrategyChangedPayload
): RecommendationDomainEvent<LearningStrategyChangedPayload> => ({
  type: 'LearningStrategyChanged',
  metadata,
  payload
});

export const recommendationInvalidatedEvent = (
  metadata: RecommendationEventMetadata,
  payload: RecommendationInvalidatedPayload
): RecommendationDomainEvent<RecommendationInvalidatedPayload> => ({
  type: 'RecommendationInvalidated',
  metadata,
  payload
});
