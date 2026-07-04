import { SkillDomainEvent, SkillEventMetadata } from './skill-event-metadata';

export type SkillCreatedPayload = {
  name: string;
  category: string;
};

export const skillCreatedEvent = (
  metadata: SkillEventMetadata,
  payload: SkillCreatedPayload,
): SkillDomainEvent<SkillCreatedPayload> => ({
  type: 'SkillCreated',
  metadata,
  payload,
});
