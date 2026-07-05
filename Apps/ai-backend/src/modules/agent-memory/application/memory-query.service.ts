import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { MemoryRecord } from '../domain/memory-record';
import { MemoryScope } from '../domain/memory-scope';
import { IMemoryRepository, MemoryOperationContext, MEMORY_REPOSITORY } from '../domain/memory.types';

/**
 * Read-only bulk queries over memory records (list a scope bucket, filter by
 * tag, or fetch every record for a scope type). Kept separate from
 * MemoryStoreService because these are fan-out reads, not single-key ops.
 */
@Injectable()
export class MemoryQueryService {
  constructor(
    @Inject(MEMORY_REPOSITORY) private readonly repository: IMemoryRepository,
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async list(scope: MemoryScope, scopeId: string, context?: MemoryOperationContext): Promise<MemoryRecord[]> {
    return this.run('LIST', `MemoryRecord:${scope}:${scopeId}:*`, context, () =>
      this.repository.list(scope, scopeId),
    );
  }

  async queryByTag(
    tag: string,
    scope?: MemoryScope,
    context?: MemoryOperationContext,
  ): Promise<MemoryRecord[]> {
    return this.run('QUERY_BY_TAG', `MemoryRecord:tag:${tag}`, context, () =>
      this.repository.queryByTag(tag, scope),
    );
  }

  async queryByScope(scope: MemoryScope, context?: MemoryOperationContext): Promise<MemoryRecord[]> {
    return this.run('QUERY_BY_SCOPE', `MemoryRecord:scope:${scope}`, context, () =>
      this.repository.queryByScope(scope),
    );
  }

  private async run<T>(
    operation: string,
    resource: string,
    context: MemoryOperationContext | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.emit(operation, resource, 'SUCCESS', Date.now() - start, context);
      return result;
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : String(error);
      this.emit(operation, resource, 'FAILURE', Date.now() - start, context, errorCode);
      throw error;
    }
  }

  private emit(
    operation: string,
    resource: string,
    status: 'SUCCESS' | 'FAILURE',
    latencyMs: number,
    context: MemoryOperationContext | undefined,
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
      capability: `memory_${operation.toLowerCase()}`,
      status,
      latencyMs,
      fallbackUsed: false,
      timedOut: false,
    });

    void this.auditLog
      ?.recordSecurityEvent({
        traceId: context?.traceId ?? randomUUID(),
        userId: context?.userId ?? null,
        operation: `MEMORY_${operation}_${status}`,
        resource,
      })
      .catch(() => undefined);
  }
}
