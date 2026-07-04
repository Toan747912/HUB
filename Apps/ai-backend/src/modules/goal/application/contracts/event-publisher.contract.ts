import { ClientSession } from 'mongoose';
import { GoalDomainEvent } from '../../domain/events/goal-event-metadata';

export interface IEventPublisher {
  publish(event: GoalDomainEvent): Promise<void>;
  publishMany(events: GoalDomainEvent[]): Promise<void>;
  stage(events: GoalDomainEvent[], session: ClientSession): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
