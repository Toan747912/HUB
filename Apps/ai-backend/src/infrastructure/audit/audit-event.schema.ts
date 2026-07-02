import { Schema } from 'mongoose';

export interface AuditEventDocument {
  _id: string;
  traceId: string;
  userId: string | null;
  operation: string;
  resource: string;
  before: unknown;
  after: unknown;
  timestamp: Date;
}

export const AuditEventSchema = new Schema(
  {
    _id: { type: String },
    traceId: { type: String, required: true, index: true },
    userId: { type: String, required: false, default: null },
    operation: { type: String, required: true, index: true },
    resource: { type: String, required: true, index: true },
    before: { type: Schema.Types.Mixed, required: false, default: null },
    after: { type: Schema.Types.Mixed, required: false, default: null },
    timestamp: { type: Date, required: true }
  },
  {
    _id: false,
    collection: 'audit_events'
  }
);

AuditEventSchema.index({ resource: 1, timestamp: -1 });
