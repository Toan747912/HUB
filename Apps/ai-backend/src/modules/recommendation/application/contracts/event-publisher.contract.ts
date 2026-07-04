import { ClientSession } from 'mongoose';
import { RecommendationDomainEvent } from '../../domain/events/recommendation-event-metadata';

export interface IEventPublisher {
  publish(event: RecommendationDomainEvent): Promise<void>;
  publishMany(events: RecommendationDomainEvent[]): Promise<void>;
  stage(events: RecommendationDomainEvent[], session: ClientSession): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
