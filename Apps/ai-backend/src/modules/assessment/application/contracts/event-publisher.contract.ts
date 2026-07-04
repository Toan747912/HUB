import { ClientSession } from 'mongoose';
import { AssessmentDomainEvent } from '../../domain/events/assessment-event-metadata';

export interface IEventPublisher {
  publish(event: AssessmentDomainEvent): Promise<void>;
  publishMany(events: AssessmentDomainEvent[]): Promise<void>;
  stage(events: AssessmentDomainEvent[], session: ClientSession): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
