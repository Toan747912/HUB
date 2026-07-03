import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { AuditEventDocument } from './audit-event.schema';

export interface AuditLogEntry {
  traceId: string;
  userId: string | null;
  operation: string;
  resource: string;
  before: unknown;
  after: unknown;
}

@Injectable()
export class AuditLogRepository {
  constructor(@InjectModel('AuditEvent') private readonly model: Model<AuditEventDocument>) {}

  async record(entry: AuditLogEntry): Promise<void> {
    await this.model.create({
      _id: randomUUID(),
      ...entry,
      timestamp: new Date(),
    });
  }

  async findByResource(resource: string, limit = 100): Promise<AuditEventDocument[]> {
    return this.model
      .find({ resource })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean<AuditEventDocument[]>()
      .exec();
  }
}
