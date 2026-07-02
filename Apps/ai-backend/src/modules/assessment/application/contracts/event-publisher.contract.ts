import { AssessmentDomainEvent } from '../../domain/events/assessment-event-metadata';

export interface IEventPublisher {
  publish(event: AssessmentDomainEvent): Promise<void>;
  publishMany(events: AssessmentDomainEvent[]): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
