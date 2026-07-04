import { ClientSession } from 'mongoose';
import { RoadmapDomainEvent } from '../../domain/events/roadmap-event-metadata';

export interface IEventPublisher {
  publish(event: RoadmapDomainEvent): Promise<void>;
  publishMany(events: RoadmapDomainEvent[]): Promise<void>;
  stage(events: RoadmapDomainEvent[], session: ClientSession): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
