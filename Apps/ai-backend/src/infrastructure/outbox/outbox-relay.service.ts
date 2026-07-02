import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  AssessmentId,
  GoalId,
  Identifier,
  RecommendationId,
  RoadmapId
} from '../../shared/domain/identifiers';
import { QueueService } from '../jobs/queue.service';
import { MetricsService } from '../observability/metrics.service';
import { DomainEvent, DomainEventMetadata } from './domain-event.contract';
import { OutboxEventDocument } from './outbox-event.schema';
import { OutboxRepository } from './outbox.repository';

const RELAY_INTERVAL_MS = 10_000;

// Reconstructs the branded aggregate identifier matching the persisted
// aggregateType, so relayed events carry a properly-typed aggregateId
// (falls back to the untyped GoalId wrapper for unknown/legacy rows — only
// `.toString()` is relied on downstream, so this fallback never loses data).
function reconstructAggregateId(aggregateType: string, aggregateId: string): Identifier<string> {
  switch (aggregateType) {
    case 'Roadmap':
      return RoadmapId.create(aggregateId);
    case 'Assessment':
      return AssessmentId.create(aggregateId);
    case 'Recommendation':
      return RecommendationId.create(aggregateId);
    case 'Goal':
    default:
      return GoalId.create(aggregateId);
  }
}

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

  private toDomainEvent(doc: OutboxEventDocument): DomainEvent<string, unknown> {
    // Reconstructed from the persisted document — traceId/correlationId/
    // causationId/aggregateType are the real values written by
    // OutboxRepository.doSaveMany, never fabricated. Any module-specific
    // metadata fields (e.g. Roadmap's goalId/plannerVersion) are spread back
    // in from the persisted `metadata` column.
    const metadata: DomainEventMetadata = {
      eventId: doc.eventId,
      aggregateId: reconstructAggregateId(doc.aggregateType, doc.aggregateId),
      aggregateType: doc.aggregateType,
      aggregateVersion: doc.aggregateVersion,
      occurredAt: doc.occurredAt.toISOString(),
      traceId: doc.traceId,
      correlationId: doc.correlationId,
      causationId: doc.causationId,
      ...doc.metadata
    };
    return {
      type: doc.eventType,
      metadata,
      payload: doc.payload
    };
  }
}
