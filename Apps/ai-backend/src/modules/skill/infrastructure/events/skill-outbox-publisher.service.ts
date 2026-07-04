import { Injectable, Logger } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { SkillDomainEvent } from '../../domain/events/skill-event-metadata';
import { IEventPublisher } from '../../application/contracts/event-publisher.contract';
import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { QueueService } from '../../../../infrastructure/jobs/queue.service';
import { TracerService } from '../../../../infrastructure/observability/tracer.service';
import { SpanFactory } from '../../../../infrastructure/observability/span.factory';
import { DomainEvent } from '../../../../infrastructure/outbox/domain-event.contract';
import { OutboxRepository } from '../../../../infrastructure/outbox/outbox.repository';

/**
 * Reuses the shared Outbox/Queue infra (durable-write-then-enqueue), same
 * shape as RoadmapOutboxPublisherService/AssessmentOutboxPublisherService.
 */
@Injectable()
export class SkillOutboxPublisherService implements IEventPublisher {
  private readonly logger = new Logger(SkillOutboxPublisherService.name);

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly queue: QueueService,
    private readonly tracer?: TracerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async publish(event: SkillDomainEvent): Promise<void> {
    await this.publishMany([event]);
  }

  async stage(events: SkillDomainEvent[], session: ClientSession): Promise<void> {
    if (events.length === 0) return;
    await this.outbox.saveMany(events, session);
  }

  async publishMany(events: SkillDomainEvent[]): Promise<void> {
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

  private async doPublishMany(events: SkillDomainEvent[]): Promise<void> {
    const domainEvents: DomainEvent[] = events;
    await this.outbox.saveMany(domainEvents);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
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
}
