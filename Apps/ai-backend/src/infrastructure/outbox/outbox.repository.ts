import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../persistence/prisma.service';
import { PrismaTransactionClient } from '../persistence/with-transaction';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';
import { DomainEvent, DomainEventMetadata } from './domain-event.contract';
import { OutboxEventDocument, OutboxStatus } from './outbox-event.schema';

// The base metadata fields that already have dedicated columns on the outbox
// row. Anything else on `event.metadata` (e.g. Roadmap's `goalId` /
// `plannerVersion`) is stashed verbatim into the `metadata` column instead of
// being silently dropped.
const BASE_METADATA_KEYS = new Set<keyof DomainEventMetadata>([
  'eventId',
  'aggregateId',
  'aggregateType',
  'aggregateVersion',
  'occurredAt',
  'traceId',
  'correlationId',
  'causationId',
]);

@Injectable()
export class OutboxRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracer?: TracerService,
  ) {}

  async saveMany(events: DomainEvent[], tx?: PrismaTransactionClient): Promise<void> {
    if (events.length === 0) return;
    const run = () => this.doSaveMany(events, tx);
    if (!this.tracer) return run();
    return this.tracer.withSpan(
      'outbox.saveMany',
      SpanFactory.attributesFor({ operation: 'saveMany' }),
      run,
    );
  }

  private async doSaveMany(events: DomainEvent[], tx?: PrismaTransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    const rows = events.map((event) => {
      const extraMetadata: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(event.metadata)) {
        if (!BASE_METADATA_KEYS.has(key as keyof DomainEventMetadata)) {
          extraMetadata[key] = value;
        }
      }

      return {
        id: event.metadata.eventId,
        eventId: event.metadata.eventId,
        aggregateId: event.metadata.aggregateId.toString(),
        aggregateType: event.metadata.aggregateType,
        aggregateVersion: event.metadata.aggregateVersion,
        eventType: event.type,
        payload: event.payload as Prisma.InputJsonValue,
        occurredAt: new Date(event.metadata.occurredAt),
        publishedAt: null,
        status: 'PENDING' as const,
        traceId: event.metadata.traceId,
        correlationId: event.metadata.correlationId,
        causationId: event.metadata.causationId,
        metadata: extraMetadata as Prisma.InputJsonValue,
      };
    });

    // Idempotent: eventId is the primary key, so replays of the same event are no-ops.
    for (const row of rows) {
      await client.outboxEvent.upsert({
        where: { id: row.id },
        update: {},
        create: row,
      });
    }
  }

  async findPending(limit = 100): Promise<OutboxEventDocument[]> {
    const run = () =>
      this.prisma.outboxEvent.findMany({ where: { status: 'PENDING' }, take: limit });
    if (!this.tracer) return run() as unknown as Promise<OutboxEventDocument[]>;
    return this.tracer.withSpan(
      'outbox.findPending',
      SpanFactory.attributesFor({ operation: 'findPending' }),
      run,
    ) as unknown as Promise<OutboxEventDocument[]>;
  }

  async markPublished(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async markFailed(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({ where: { id: eventId }, data: { status: 'FAILED' } });
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    return this.prisma.outboxEvent.count({ where: { status } });
  }
}
