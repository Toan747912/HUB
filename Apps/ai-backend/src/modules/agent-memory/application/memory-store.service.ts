import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { MemoryRecord } from '../domain/memory-record';
import { MemoryScope } from '../domain/memory-scope';
import {
  IMemoryRepository,
  MemoryDeleteInput,
  MemoryGetInput,
  MemoryOperationContext,
  MemorySetInput,
  MEMORY_REPOSITORY,
} from '../domain/memory.types';

/**
 * Read/write/delete surface for individual memory keys. Every call emits a
 * structured log, a metric, and an audit event, mirroring RuntimeExecutor's
 * emitObservability pattern so memory ops are as observable as workflow steps.
 */
@Injectable()
export class MemoryStoreService {
  constructor(
    @Inject(MEMORY_REPOSITORY) private readonly repository: IMemoryRepository,
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async set(input: MemorySetInput, context?: MemoryOperationContext): Promise<MemoryRecord> {
    return this.run('SET', input.scope, input.scopeId, input.key, context, () => this.repository.set(input));
  }

  async get(input: MemoryGetInput, context?: MemoryOperationContext): Promise<MemoryRecord | null> {
    return this.run('GET', input.scope, input.scopeId, input.key, context, () => this.repository.get(input));
  }

  async delete(input: MemoryDeleteInput, context?: MemoryOperationContext): Promise<boolean> {
    return this.run('DELETE', input.scope, input.scopeId, input.key, context, () => this.repository.delete(input));
  }

  /**
   * Thin passthrough to IMemoryRepository.queryByScope, exposed so callers
   * outside agent-memory (e.g. CollaborationService recovering its session
   * cache after a restart) never need to touch MEMORY_REPOSITORY directly.
   */
  async queryByScope(scope: MemoryScope): Promise<MemoryRecord[]> {
    return this.run('QUERY_BY_SCOPE', scope, '*', '*', undefined, () => this.repository.queryByScope(scope));
  }

  private async run<T>(
    operation: 'SET' | 'GET' | 'DELETE' | 'QUERY_BY_SCOPE',
    scope: MemoryScope,
    scopeId: string,
    key: string,
    context: MemoryOperationContext | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    const resource = `MemoryRecord:${scope}:${scopeId}:${key}`;
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
