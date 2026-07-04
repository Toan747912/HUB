import { SkillId } from '../../../../shared/domain/identifiers';

export type SkillEventMetadata = {
  eventId: string;
  aggregateId: SkillId;
  aggregateType: 'Skill';
  aggregateVersion: number;
  occurredAt: string;
  traceId: string;
  correlationId: string;
  causationId: string;
};

export type SkillDomainEvent<TPayload = Record<string, unknown>> = {
  type: 'SkillCreated';
  metadata: SkillEventMetadata;
  payload: TPayload;
};
