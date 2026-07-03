import {
  LearningSessionDomainEvent,
  LearningSessionEventMetadata,
} from './learning-session-event-metadata';

export type LearningSessionCreatedPayload = {
  goalId: string;
  roadmapId: string;
  learnerId: string;
};

export type LearningSessionStartedPayload = {
  startedAt: string;
};

export type LearningSessionPausedPayload = {
  pausedAt: string;
  reason?: string;
};

export type LearningSessionResumedPayload = {
  resumedAt: string;
};

export type LearningSessionCompletedPayload = {
  completedAt: string;
  focusScore: number;
  engagementScore: number;
};

export type LearningSessionCancelledPayload = {
  cancelledAt: string;
  reason?: string;
};

export type EvidenceRecordedPayload = {
  evidenceId: string;
  activityId?: string;
  completedTasks: number;
  timeSpent: number;
  interruptions: number;
  focusScore: number;
  engagementScore: number;
};

export type ProgressUpdatedPayload = {
  completedTasksCount: number;
  totalTasksCount: number;
  completionRate: number;
};

export const learningSessionCreatedEvent = (
  metadata: LearningSessionEventMetadata,
  payload: LearningSessionCreatedPayload,
): LearningSessionDomainEvent<LearningSessionCreatedPayload> => ({
  type: 'LearningSessionCreated',
  metadata,
  payload,
});

export const learningSessionStartedEvent = (
  metadata: LearningSessionEventMetadata,
  payload: LearningSessionStartedPayload,
): LearningSessionDomainEvent<LearningSessionStartedPayload> => ({
  type: 'LearningSessionStarted',
  metadata,
  payload,
});

export const learningSessionPausedEvent = (
  metadata: LearningSessionEventMetadata,
  payload: LearningSessionPausedPayload,
): LearningSessionDomainEvent<LearningSessionPausedPayload> => ({
  type: 'LearningSessionPaused',
  metadata,
  payload,
});

export const learningSessionResumedEvent = (
  metadata: LearningSessionEventMetadata,
  payload: LearningSessionResumedPayload,
): LearningSessionDomainEvent<LearningSessionResumedPayload> => ({
  type: 'LearningSessionResumed',
  metadata,
  payload,
});

export const learningSessionCompletedEvent = (
  metadata: LearningSessionEventMetadata,
  payload: LearningSessionCompletedPayload,
): LearningSessionDomainEvent<LearningSessionCompletedPayload> => ({
  type: 'LearningSessionCompleted',
  metadata,
  payload,
});

export const learningSessionCancelledEvent = (
  metadata: LearningSessionEventMetadata,
  payload: LearningSessionCancelledPayload,
): LearningSessionDomainEvent<LearningSessionCancelledPayload> => ({
  type: 'LearningSessionCancelled',
  metadata,
  payload,
});

export const evidenceRecordedEvent = (
  metadata: LearningSessionEventMetadata,
  payload: EvidenceRecordedPayload,
): LearningSessionDomainEvent<EvidenceRecordedPayload> => ({
  type: 'EvidenceRecorded',
  metadata,
  payload,
});

export const progressUpdatedEvent = (
  metadata: LearningSessionEventMetadata,
  payload: ProgressUpdatedPayload,
): LearningSessionDomainEvent<ProgressUpdatedPayload> => ({
  type: 'ProgressUpdated',
  metadata,
  payload,
});
