import { Injectable, Logger } from '@nestjs/common';
import { GoalDomainEvent } from '../../../goal/domain/events/goal-event-metadata';
import { RecommendationDomainEvent } from '../../domain/events/recommendation-event-metadata';
import { IEventPublisher } from '../../application/contracts/event-publisher.contract';
import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { QueueService } from '../../../../infrastructure/jobs/queue.service';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../infrastructure/observability/tracer.service';
import { OutboxRepository } from '../../../../infrastructure/outbox/outbox.repository';

/**
 * Reuses the shared Outbox/Queue infra (durable-write-then-enqueue) without
 * modifying its Goal-shaped generics. RecommendationDomainEvent has the same
 * {type, metadata, payload} shape at runtime, so the cast at this seam is safe
 * (same pattern already established by the Roadmap and Assessment modules).
 */
@Injectable()
export class RecommendationOutboxPublisherService implements IEventPublisher {
  private readonly logger = new Logger(RecommendationOutboxPublisherService.name);

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly queue: QueueService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService
  ) {}

  async publish(event: RecommendationDomainEvent): Promise<void> {
    await this.publishMany([event]);
  }

  async publishMany(events: RecommendationDomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    const run = () => this.doPublishMany(events);
    if (!this.tracer) {
      await run();
      return;
    }
    await this.tracer.withSpan('outbox.publishMany', SpanFactory.attributesFor({ operation: 'publishMany' }), run);
  }

  private async doPublishMany(events: RecommendationDomainEvent[]): Promise<void> {
    const goalShapedEvents = events as unknown as GoalDomainEvent[];
    await this.outbox.saveMany(goalShapedEvents);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      this.recordBusinessMetrics(event);
      await this.auditLog?.recordFromDomainEvent(goalShapedEvents[i]).catch(() => undefined);

      try {
        await this.queue.enqueue(goalShapedEvents[i]);
        await this.outbox.markPublished(event.metadata.eventId);
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: 'outbox_immediate_enqueue_failed',
            eventId: event.metadata.eventId,
            aggregateId: event.metadata.aggregateId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          })
        );
      }
    }
  }

  private recordBusinessMetrics(event: RecommendationDomainEvent): void {
    if (event.type === 'RecommendationGenerated') {
      const payload = event.payload as { averageConfidence?: number };
      this.metrics?.incrementRecommendationGenerated();
      if (typeof payload.averageConfidence === 'number') {
        this.metrics?.recordRecommendationConfidence(payload.averageConfidence);
      }
    }
    if (event.type === 'LearningStrategyChanged') {
      const payload = event.payload as { strategies?: { strategy: string }[] };
      for (const strategy of payload.strategies ?? []) {
        this.metrics?.incrementStrategyDistribution(strategy.strategy);
      }
    }
  }
}
