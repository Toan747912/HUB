import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { GoalDomainEvent, GoalEventMetadata } from '../../modules/goal/domain/events/goal-event-metadata';
import { QueueService } from '../jobs/queue.service';
import { MetricsService } from '../observability/metrics.service';
import { OutboxEventDocument } from './outbox-event.schema';
import { OutboxRepository } from './outbox.repository';

const RELAY_INTERVAL_MS = 10_000;

@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly queue: QueueService,
    private readonly metrics?: MetricsService
  ) {}

  @Interval(RELAY_INTERVAL_MS)
  async sweep(): Promise<void> {
    await this.relayPending();
  }

  async relayPending(limit = 100): Promise<number> {
    const pending = await this.outbox.findPending(limit);
    this.metrics?.setOutboxPending(pending.length);
    let relayed = 0;

    for (const doc of pending) {
      try {
        await this.queue.enqueue(this.toDomainEvent(doc));
        await this.outbox.markPublished(doc.eventId);
        relayed++;
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: 'outbox_relay_failed',
            eventId: doc.eventId,
            aggregateId: doc.aggregateId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          })
        );
      }
    }

    if (pending.length > 0) {
      this.logger.log(
        JSON.stringify({ event: 'outbox_relay_sweep', found: pending.length, relayed, timestamp: new Date().toISOString() })
      );
    }

    return relayed;
  }

  private toDomainEvent(doc: OutboxEventDocument): GoalDomainEvent {
    const metadata: GoalEventMetadata = {
      eventId: doc.eventId,
      aggregateId: doc.aggregateId,
      aggregateVersion: doc.aggregateVersion,
      occurredAt: doc.occurredAt.toISOString(),
      traceId: 'outbox-relay',
      correlationId: doc.eventId,
      causationId: doc.eventId
    };
    return {
      type: doc.eventType as GoalDomainEvent['type'],
      metadata,
      payload: doc.payload
    };
  }
}
