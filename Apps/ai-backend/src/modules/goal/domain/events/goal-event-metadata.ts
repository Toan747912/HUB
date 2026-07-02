import { GoalId } from '../../../../shared/domain/identifiers';

export type GoalEventMetadata = {
  eventId: string;
  aggregateId: GoalId;
  aggregateType: 'Goal';
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
};

export type GoalDomainEvent<TPayload = Record<string, unknown>> = {
  type:
    | 'GoalCreated'
    | 'GoalUpdated'
    | 'GoalArchived'
    | 'GoalCompleted'
    | 'GoalConstraintChanged'
    | 'GoalMilestoneReached';
  metadata: GoalEventMetadata;
  payload: TPayload;
};
