import { GoalDomainEvent, GoalEventMetadata } from './goal-event-metadata';

export type GoalCreatedPayload = {
  learnerId: string;
  status: string;
  title: string;
};

export type GoalUpdatedPayload = {
  changes: Record<string, unknown>;
};

export type GoalArchivedPayload = {
  previousStatus: string;
  reason?: string;
};

export type GoalCompletedPayload = {
  previousStatus: string;
  completionRatio: number;
};

export type GoalConstraintChangedPayload = {
  constraintId: string;
  changeType: 'ADDED' | 'UPDATED' | 'REMOVED';
};

export type GoalMilestoneReachedPayload = {
  milestoneId: string;
  completionRatio: number;
};

export const goalCreatedEvent = (
  metadata: GoalEventMetadata,
  payload: GoalCreatedPayload,
): GoalDomainEvent<GoalCreatedPayload> => ({
  type: 'GoalCreated',
  metadata,
  payload,
});

export const goalUpdatedEvent = (
  metadata: GoalEventMetadata,
  payload: GoalUpdatedPayload,
): GoalDomainEvent<GoalUpdatedPayload> => ({
  type: 'GoalUpdated',
  metadata,
  payload,
});

export const goalArchivedEvent = (
  metadata: GoalEventMetadata,
  payload: GoalArchivedPayload,
): GoalDomainEvent<GoalArchivedPayload> => ({
  type: 'GoalArchived',
  metadata,
  payload,
});

export const goalCompletedEvent = (
  metadata: GoalEventMetadata,
  payload: GoalCompletedPayload,
): GoalDomainEvent<GoalCompletedPayload> => ({
  type: 'GoalCompleted',
  metadata,
  payload,
});

export const goalConstraintChangedEvent = (
  metadata: GoalEventMetadata,
  payload: GoalConstraintChangedPayload,
): GoalDomainEvent<GoalConstraintChangedPayload> => ({
  type: 'GoalConstraintChanged',
  metadata,
  payload,
});

export const goalMilestoneReachedEvent = (
  metadata: GoalEventMetadata,
  payload: GoalMilestoneReachedPayload,
): GoalDomainEvent<GoalMilestoneReachedPayload> => ({
  type: 'GoalMilestoneReached',
  metadata,
  payload,
});
