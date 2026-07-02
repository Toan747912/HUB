import { Injectable, Logger } from '@nestjs/common';
import { GoalDomainEvent } from '../../../goal/domain/events/goal-event-metadata';
import { AssessmentDomainEvent } from '../../domain/events/assessment-event-metadata';
import { IEventPublisher } from '../../application/contracts/event-publisher.contract';
import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { QueueService } from '../../../../infrastructure/jobs/queue.service';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../infrastructure/observability/tracer.service';
import { OutboxRepository } from '../../../../infrastructure/outbox/outbox.repository';

/**
 * Reuses the shared Outbox/Queue infra (durable-write-then-enqueue) without
 * modifying its Goal-shaped generics. AssessmentDomainEvent has the same
 * {type, metadata, payload} shape at runtime, so the cast at this seam is safe.
 */
@Injectable()
export class AssessmentOutboxPublisherService implements IEventPublisher {
  private readonly logger = new Logger(AssessmentOutboxPublisherService.name);

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly queue: QueueService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService
  ) {}

  async publish(event: AssessmentDomainEvent): Promise<void> {
    await this.publishMany([event]);
  }

  async publishMany(events: AssessmentDomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    const run = () => this.doPublishMany(events);
    if (!this.tracer) {
      await run();
      return;
    }
    await this.tracer.withSpan('outbox.publishMany', SpanFactory.attributesFor({ operation: 'publishMany' }), run);
  }

  private async doPublishMany(events: AssessmentDomainEvent[]): Promise<void> {
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

  private recordBusinessMetrics(event: AssessmentDomainEvent): void {
    if (event.type === 'AssessmentCompleted') {
      this.metrics?.incrementAssessmentRun();
    }
    if (event.type === 'KnowledgeGapDetected') {
      const gapCount = (event.payload as { gaps?: unknown[] }).gaps?.length ?? 0;
      this.metrics?.incrementKnowledgeGap(gapCount);
    }
    if (event.type === 'AssessmentCompleted') {
      const confidenceScore = (event.payload as { confidenceScore?: number }).confidenceScore ?? 0;
      this.metrics?.recordConfidenceScore(confidenceScore);
    }
  }
}
