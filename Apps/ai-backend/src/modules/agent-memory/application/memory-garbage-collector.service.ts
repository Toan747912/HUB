import { Inject, Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { IMemoryRepository, MEMORY_REPOSITORY } from '../domain/memory.types';

const CLEANUP_INTERVAL_MS = 60_000;

/**
 * TTL cleanup for expired memory records, scheduled on the same @Interval
 * pattern as OutboxRelayService.sweep() - deletes every record whose
 * expiresAt has passed. cleanupExpired() remains directly callable (an
 * admin endpoint or a test may still invoke it on demand).
 */
@Injectable()
export class MemoryGarbageCollectorService {
  constructor(
    @Inject(MEMORY_REPOSITORY) private readonly repository: IMemoryRepository,
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  @Interval(CLEANUP_INTERVAL_MS)
  async sweep(): Promise<void> {
    await this.cleanupExpired().catch(() => undefined);
  }

  async cleanupExpired(now: Date = new Date()): Promise<{ deletedCount: number }> {
    const start = Date.now();
    const resource = 'MemoryRecord:expired';
    try {
      const deletedCount = await this.repository.deleteExpired(now);
      this.emit('CLEANUP_EXPIRED', resource, 'SUCCESS', Date.now() - start, { deletedCount });
      return { deletedCount };
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : String(error);
      this.emit('CLEANUP_EXPIRED', resource, 'FAILURE', Date.now() - start, undefined, errorCode);
      throw error;
    }
  }

  private emit(
    operation: string,
    resource: string,
    status: 'SUCCESS' | 'FAILURE',
    latencyMs: number,
    after?: unknown,
    errorCode?: string,
  ): void {
    this.structuredLogger?.log({
      operation: `MEMORY_${operation}`,
      status,
      latencyMs,
      aggregateId: resource,
      errorCode,
    });

    this.metrics?.recordPlannerOutcome?.({
      capability: 'memory_gc',
      status,
      latencyMs,
      fallbackUsed: false,
      timedOut: false,
    });

    void this.auditLog
      ?.recordSecurityEvent({
        traceId: randomUUID(),
        userId: null,
        operation: `MEMORY_${operation}_${status}`,
        resource,
        after,
      })
      .catch(() => undefined);
  }
}
