import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/persistence/prisma.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { MemoryRecord } from '../domain/memory-record';
import { MemoryScope } from '../domain/memory-scope';
import {
  IMemoryRepository,
  MemoryDeleteInput,
  MemoryGetInput,
  MemorySetInput,
} from '../domain/memory.types';
import { MemoryRecordDocument } from '../schemas/memory-record.schema';

@Injectable()
export class PrismaMemoryRepository implements IMemoryRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics?: MetricsService,
  ) {}

  async set(input: MemorySetInput): Promise<MemoryRecord> {
    return this.instrumented('set', async () => {
      const expiresAt = input.ttlMs ? new Date(Date.now() + input.ttlMs) : null;
      const tags = input.tags ?? [];
      const row = await this.prisma.memoryRecord.upsert({
        where: {
          scope_scopeId_key: { scope: input.scope, scopeId: input.scopeId, key: input.key },
        },
        update: {
          value: (input.value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          expiresAt,
          tags: tags as unknown as Prisma.InputJsonValue,
          version: { increment: 1 },
        },
        create: {
          id: randomUUID(),
          scope: input.scope,
          scopeId: input.scopeId,
          key: input.key,
          value: (input.value ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          expiresAt,
          tags: tags as unknown as Prisma.InputJsonValue,
          version: 1,
        },
      });
      return this.toDomain(this.toDocument(row));
    });
  }

  async get(input: MemoryGetInput): Promise<MemoryRecord | null> {
    return this.instrumented('get', async () => {
      const row = await this.prisma.memoryRecord.findUnique({
        where: {
          scope_scopeId_key: { scope: input.scope, scopeId: input.scopeId, key: input.key },
        },
      });
      if (!row) return null;
      const doc = this.toDocument(row);
      if (this.isExpired(doc)) return null;
      return this.toDomain(doc);
    });
  }

  async delete(input: MemoryDeleteInput): Promise<boolean> {
    return this.instrumented('delete', async () => {
      const result = await this.prisma.memoryRecord.deleteMany({
        where: { scope: input.scope, scopeId: input.scopeId, key: input.key },
      });
      return result.count > 0;
    });
  }

  async list(scope: MemoryScope, scopeId: string): Promise<MemoryRecord[]> {
    return this.instrumented('list', async () => {
      const rows = await this.prisma.memoryRecord.findMany({ where: { scope, scopeId } });
      return rows
        .map((r) => this.toDocument(r))
        .filter((doc) => !this.isExpired(doc))
        .map((doc) => this.toDomain(doc));
    });
  }

  async queryByTag(tag: string, scope?: MemoryScope): Promise<MemoryRecord[]> {
    return this.instrumented('queryByTag', async () => {
      const rows = await this.prisma.memoryRecord.findMany({
        where: { ...(scope ? { scope } : {}), tags: { array_contains: tag } },
      });
      return rows
        .map((r) => this.toDocument(r))
        .filter((doc) => !this.isExpired(doc))
        .map((doc) => this.toDomain(doc));
    });
  }

  async queryByScope(scope: MemoryScope): Promise<MemoryRecord[]> {
    return this.instrumented('queryByScope', async () => {
      const rows = await this.prisma.memoryRecord.findMany({ where: { scope } });
      return rows
        .map((r) => this.toDocument(r))
        .filter((doc) => !this.isExpired(doc))
        .map((doc) => this.toDomain(doc));
    });
  }

  async deleteExpired(now: Date): Promise<number> {
    return this.instrumented('deleteExpired', async () => {
      const result = await this.prisma.memoryRecord.deleteMany({
        where: { expiresAt: { not: null, lte: now } },
      });
      return result.count;
    });
  }

  private isExpired(doc: MemoryRecordDocument): boolean {
    return !!doc.expiresAt && doc.expiresAt.getTime() <= Date.now();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): MemoryRecordDocument {
    return {
      _id: row.id,
      scope: row.scope,
      scopeId: row.scopeId,
      key: row.key,
      value: row.value,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      expiresAt: row.expiresAt,
      version: row.version,
      tags: row.tags,
    };
  }

  private toDomain(doc: MemoryRecordDocument): MemoryRecord {
    return {
      id: doc._id,
      scope: doc.scope,
      scopeId: doc.scopeId,
      key: doc.key,
      value: doc.value,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      expiresAt: doc.expiresAt ?? null,
      version: doc.version,
      tags: doc.tags ?? [],
    };
  }

  private async instrumented<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      this.metrics?.recordDbLatency(`memory.${operation}`, Date.now() - start);
    }
  }
}
