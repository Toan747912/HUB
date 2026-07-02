import { Schema } from 'mongoose';

export type OutboxStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

export interface OutboxEventDocument {
  _id: string;
  eventId: string;
  aggregateId: string;
  aggregateVersion: number;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  publishedAt: Date | null;
  status: OutboxStatus;
}

export const OutboxEventSchema = new Schema(
  {
    _id: { type: String },
    eventId: { type: String, required: true, index: true, unique: true },
    aggregateId: { type: String, required: true, index: true },
    aggregateVersion: { type: Number, required: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    occurredAt: { type: Date, required: true },
    publishedAt: { type: Date, required: false, default: null },
    status: { type: String, required: true, default: 'PENDING', index: true }
  },
  {
    _id: false,
    timestamps: true,
    collection: 'outbox_events'
  }
);

OutboxEventSchema.index({ status: 1, occurredAt: 1 });
