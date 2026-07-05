import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../persistence/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        traceId: entry.traceId,
        userId: entry.userId,
        operation: entry.operation,
        resource: entry.resource,
        before: (entry.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        after: (entry.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        timestamp: new Date(),
      },
    });
  }

  async findByResource(resource: string, limit = 100): Promise<AuditEventDocument[]> {
    const rows = await this.prisma.auditEvent.findMany({
      where: { resource },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map((row) => ({
      _id: row.id,
      traceId: row.traceId,
      userId: row.userId,
      operation: row.operation,
      resource: row.resource,
      before: row.before,
      after: row.after,
      timestamp: row.timestamp,
    }));
  }
}
