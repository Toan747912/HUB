import { Injectable, Logger } from '@nestjs/common';
import { PrismaTransactionClient } from '../persistence/with-transaction';
import { IEventPublisher } from '../../modules/goal/application/contracts/event-publisher.contract';
import { GoalDomainEvent } from '../../modules/goal/domain/events/goal-event-metadata';
import { AuditLogService } from '../audit/audit-log.service';
import { QueueService } from '../jobs/queue.service';
import { MetricsService } from '../observability/metrics.service';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';
import { DomainEvent } from './domain-event.contract';
import { OutboxRepository } from './outbox.repository';

@Injectable()
export class OutboxPublisherService implements IEventPublisher {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly queue: QueueService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async publish(event: GoalDomainEvent): Promise<void> {
    await this.publishMany([event]);
  }

  async stage(events: GoalDomainEvent[], tx: PrismaTransactionClient): Promise<void> {
    if (events.length === 0) return;
    await this.outbox.saveMany(events, tx);
  }

  async publishMany(events: GoalDomainEvent[]): Promise<void> {
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

  private async doPublishMany(events: GoalDomainEvent[]): Promise<void> {
    // Durability first: events are safe in the outbox before we ever touch the queue.
    const domainEvents: DomainEvent[] = events;
    await this.outbox.saveMany(domainEvents);

    for (const event of events) {
      this.recordBusinessMetrics(event);
      await this.auditLog?.recordFromDomainEvent(event).catch(() => undefined);

      try {
        await this.queue.enqueue(event);
        await this.outbox.markPublished(event.metadata.eventId);
      } catch (error) {
        // Best-effort: leave the row PENDING. OutboxRelayService will retry it.
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

  private recordBusinessMetrics(event: GoalDomainEvent): void {
    if (event.type === 'GoalCreated') {
      this.metrics?.incrementGoalCreated();
    } else if (event.type === 'GoalCompleted') {
      this.metrics?.incrementGoalCompleted();
    }
  }
}
