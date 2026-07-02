import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';
import { DomainEvent, DomainEventMetadata } from './domain-event.contract';
import { OutboxEventDocument } from './outbox-event.schema';

// The base metadata fields that already have dedicated columns on the outbox
// document. Anything else on `event.metadata` (e.g. Roadmap's `goalId` /
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
  'causationId'
]);

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectModel('OutboxEvent') private readonly model: Model<OutboxEventDocument>,
    private readonly tracer?: TracerService
  ) {}

  async saveMany(events: DomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    const run = () => this.doSaveMany(events);
    if (!this.tracer) return run();
    return this.tracer.withSpan('outbox.saveMany', SpanFactory.attributesFor({ operation: 'saveMany' }), run);
  }

  private async doSaveMany(events: DomainEvent[]): Promise<void> {
    const docs = events.map((event) => {
      const extraMetadata: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(event.metadata)) {
        if (!BASE_METADATA_KEYS.has(key as keyof DomainEventMetadata)) {
          extraMetadata[key] = value;
        }
      }

      return {
        _id: event.metadata.eventId,
        eventId: event.metadata.eventId,
        aggregateId: event.metadata.aggregateId.toString(),
        aggregateType: event.metadata.aggregateType,
        aggregateVersion: event.metadata.aggregateVersion,
        eventType: event.type,
        payload: event.payload as Record<string, unknown>,
        occurredAt: new Date(event.metadata.occurredAt),
        publishedAt: null,
        status: 'PENDING' as const,
        traceId: event.metadata.traceId,
        correlationId: event.metadata.correlationId,
        causationId: event.metadata.causationId,
        metadata: extraMetadata
      };
    });

    // Idempotent: eventId is the primary key, so replays of the same event are no-ops.
    await this.model.bulkWrite(
      docs.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $setOnInsert: doc },
          upsert: true
        }
      }))
    );
  }

  async findPending(limit = 100): Promise<OutboxEventDocument[]> {
    const run = () => this.model.find({ status: 'PENDING' }).limit(limit).lean<OutboxEventDocument[]>().exec();
    if (!this.tracer) return run();
    return this.tracer.withSpan('outbox.findPending', SpanFactory.attributesFor({ operation: 'findPending' }), run);
  }

  async markPublished(eventId: string): Promise<void> {
    await this.model.updateOne(
      { _id: eventId },
      { $set: { status: 'PUBLISHED', publishedAt: new Date() } }
    );
  }

  async markFailed(eventId: string): Promise<void> {
    await this.model.updateOne({ _id: eventId }, { $set: { status: 'FAILED' } });
  }

  async countByStatus(status: OutboxEventDocument['status']): Promise<number> {
    return this.model.countDocuments({ status });
  }
}
