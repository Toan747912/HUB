import { LearningSessionDomainEvent } from '../../domain/events/learning-session-event-metadata';

export interface IEventPublisher {
  publish(event: LearningSessionDomainEvent): Promise<void>;
  publishMany(events: LearningSessionDomainEvent[]): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
