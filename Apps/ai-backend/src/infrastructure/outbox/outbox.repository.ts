import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoalDomainEvent } from '../../modules/goal/domain/events/goal-event-metadata';
import { SpanFactory } from '../observability/span.factory';
import { TracerService } from '../observability/tracer.service';
import { OutboxEventDocument } from './outbox-event.schema';

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectModel('OutboxEvent') private readonly model: Model<OutboxEventDocument>,
    private readonly tracer?: TracerService
  ) {}

  async saveMany(events: GoalDomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    const run = () => this.doSaveMany(events);
    if (!this.tracer) return run();
    return this.tracer.withSpan('outbox.saveMany', SpanFactory.attributesFor({ operation: 'saveMany' }), run);
  }

  private async doSaveMany(events: GoalDomainEvent[]): Promise<void> {
    const docs = events.map((event) => ({
      _id: event.metadata.eventId,
      eventId: event.metadata.eventId,
      aggregateId: event.metadata.aggregateId.toString(),
      aggregateVersion: event.metadata.aggregateVersion,
      eventType: event.type,
      payload: event.payload,
      occurredAt: new Date(event.metadata.occurredAt),
      publishedAt: null,
      status: 'PENDING' as const
    }));

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
