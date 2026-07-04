import { Injectable, Logger } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { RoadmapDomainEvent } from '../../domain/events/roadmap-event-metadata';
import { IEventPublisher } from '../../application/contracts/event-publisher.contract';
import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { QueueService } from '../../../../infrastructure/jobs/queue.service';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../infrastructure/observability/tracer.service';
import { DomainEvent } from '../../../../infrastructure/outbox/domain-event.contract';
import { OutboxRepository } from '../../../../infrastructure/outbox/outbox.repository';

/**
 * Reuses the shared Outbox/Queue infra (durable-write-then-enqueue). The
 * shared infra is typed against the generic `DomainEvent` contract, so
 * RoadmapDomainEvent — a structural superset — is passed through with a
 * plain (safe) upcast instead of an `as unknown as GoalDomainEvent[]` cast.
 */
@Injectable()
export class RoadmapOutboxPublisherService implements IEventPublisher {
  private readonly logger = new Logger(RoadmapOutboxPublisherService.name);

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly queue: QueueService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async publish(event: RoadmapDomainEvent): Promise<void> {
    await this.publishMany([event]);
  }

  async stage(events: RoadmapDomainEvent[], session: ClientSession): Promise<void> {
    if (events.length === 0) return;
    await this.outbox.saveMany(events, session);
  }

  async publishMany(events: RoadmapDomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    const run = () => this.doPublishMany(events);
    if (!this.tracer) {
      await run();
      return;
    }
    await this.tracer.withSpan(
      'outbox.publishMany',
      SpanFactory.attributesFor({ operation: 'publishMany' }),
      run,
    );
  }

  private async doPublishMany(events: RoadmapDomainEvent[]): Promise<void> {
    const domainEvents: DomainEvent[] = events;
    await this.outbox.saveMany(domainEvents);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      this.recordBusinessMetrics(event);
      await this.auditLog?.recordFromDomainEvent(domainEvents[i]).catch(() => undefined);

      try {
        await this.queue.enqueue(domainEvents[i]);
        await this.outbox.markPublished(event.metadata.eventId);
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: 'outbox_immediate_enqueue_failed',
            eventId: event.metadata.eventId,
            aggregateId: event.metadata.aggregateId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          }),
        );
      }
    }
  }

  private recordBusinessMetrics(event: RoadmapDomainEvent): void {
    if (event.type === 'RoadmapCreated') {
      this.metrics?.incrementRoadmapCreated();
    } else if (event.type === 'RoadmapRegenerated') {
      this.metrics?.incrementRoadmapRegenerated();
    }
  }
}
