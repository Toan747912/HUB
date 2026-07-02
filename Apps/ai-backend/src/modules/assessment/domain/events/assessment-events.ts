import { AssessmentDomainEvent, AssessmentEventMetadata } from './assessment-event-metadata';

export type AssessmentCreatedPayload = {
  goalId: string;
  roadmapId: string;
  learnerId: string;
  status: string;
};

export type AssessmentCompletedPayload = {
  confidenceScore: number;
  readiness: string;
  gapCount: number;
};

export type CompetencyUpdatedPayload = {
  competencies: { skillArea: string; score: number; level: string }[];
  weakAreas: string[];
  strongAreas: string[];
};

export type KnowledgeGapDetectedPayload = {
  gaps: { skillArea: string; weight: string; reason: string }[];
};

export type AssessmentArchivedPayload = {
  previousStatus: string;
};

export const assessmentCreatedEvent = (
  metadata: AssessmentEventMetadata,
  payload: AssessmentCreatedPayload
): AssessmentDomainEvent<AssessmentCreatedPayload> => ({
  type: 'AssessmentCreated',
  metadata,
  payload
});

export const assessmentCompletedEvent = (
  metadata: AssessmentEventMetadata,
  payload: AssessmentCompletedPayload
): AssessmentDomainEvent<AssessmentCompletedPayload> => ({
  type: 'AssessmentCompleted',
  metadata,
  payload
});

export const competencyUpdatedEvent = (
  metadata: AssessmentEventMetadata,
  payload: CompetencyUpdatedPayload
): AssessmentDomainEvent<CompetencyUpdatedPayload> => ({
  type: 'CompetencyUpdated',
  metadata,
  payload
});

export const knowledgeGapDetectedEvent = (
  metadata: AssessmentEventMetadata,
  payload: KnowledgeGapDetectedPayload
): AssessmentDomainEvent<KnowledgeGapDetectedPayload> => ({
  type: 'KnowledgeGapDetected',
  metadata,
  payload
});

export const assessmentArchivedEvent = (
  metadata: AssessmentEventMetadata,
  payload: AssessmentArchivedPayload
): AssessmentDomainEvent<AssessmentArchivedPayload> => ({
  type: 'AssessmentArchived',
  metadata,
  payload
});
