import { PrismaTransactionClient } from '../../../../infrastructure/persistence/with-transaction';
import { RoadmapDomainEvent } from '../../domain/events/roadmap-event-metadata';

export interface IEventPublisher {
  publish(event: RoadmapDomainEvent): Promise<void>;
  publishMany(events: RoadmapDomainEvent[]): Promise<void>;
  stage(events: RoadmapDomainEvent[], tx: PrismaTransactionClient): Promise<void>;
}

export const EVENT_PUBLISHER = Symbol('IEventPublisher');
