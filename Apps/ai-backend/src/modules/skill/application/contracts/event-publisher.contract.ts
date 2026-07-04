import { ClientSession } from 'mongoose';
import { SkillDomainEvent } from '../../domain/events/skill-event-metadata';

export interface IEventPublisher {
  publish(event: SkillDomainEvent): Promise<void>;
  publishMany(events: SkillDomainEvent[]): Promise<void>;
  stage(events: SkillDomainEvent[], session: ClientSession): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
