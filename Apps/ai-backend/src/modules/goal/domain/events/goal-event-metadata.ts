export type GoalEventMetadata = {
  eventId: string;
  aggregateId: string;
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
