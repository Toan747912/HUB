import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { MemoryStoreService } from '../../agent-memory/application/memory-store.service';
import { MemoryScope } from '../../agent-memory/domain/memory-scope';
import { IAgentContext, IAgentMemory } from '../domain/interfaces';

/**
 * Drop-in IAgentMemory adapter backed by the persistent agent-memory module
 * (MongoDB) instead of an in-process Map, so agent memory survives restarts
 * and is shared across runtime instances. Every key is scoped as an AGENT
 * bucket keyed by userId, matching the prior "${userId}:${key}" behavior.
 *
 * Every read/write emits a structured log, a metric, and an audit event,
 * reusing the same StructuredLoggerService/MetricsService/AuditLogService
 * every other agent-* module already uses.
 */
@Injectable()
export class MemoryAdapterService implements IAgentMemory {
  constructor(
    private readonly memoryStore: MemoryStoreService,
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async read(key: string, context: IAgentContext): Promise<unknown | null> {
    const startedAt = Date.now();
    try {
      const record = await this.memoryStore.get(
        { scope: MemoryScope.AGENT, scopeId: context.userId, key },
        { traceId: context.traceId, userId: context.userId },
      );
      this.emitOutcome('AGENT_CORE_MEMORY_READ', key, context, Date.now() - startedAt, 'SUCCESS');
      return record ? record.value : null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emitOutcome('AGENT_CORE_MEMORY_READ', key, context, Date.now() - startedAt, 'FAILURE', message);
      throw error;
    }
  }

  async write(key: string, value: unknown, context: IAgentContext): Promise<void> {
    const startedAt = Date.now();
    try {
      await this.memoryStore.set(
        { scope: MemoryScope.AGENT, scopeId: context.userId, key, value },
        { traceId: context.traceId, userId: context.userId },
      );
      this.emitOutcome('AGENT_CORE_MEMORY_WRITE', key, context, Date.now() - startedAt, 'SUCCESS');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emitOutcome('AGENT_CORE_MEMORY_WRITE', key, context, Date.now() - startedAt, 'FAILURE', message);
      throw error;
    }
  }

  private emitOutcome(
    operation: 'AGENT_CORE_MEMORY_READ' | 'AGENT_CORE_MEMORY_WRITE',
    key: string,
    context: IAgentContext,
    latencyMs: number,
    status: 'SUCCESS' | 'FAILURE',
    errorMessage?: string,
  ): void {
    this.structuredLogger?.log({
      operation,
      status,
      latencyMs,
      aggregateId: `${context.userId}:${key}`,
      errorCode: errorMessage,
    });

    this.metrics?.recordPlannerOutcome?.({
      capability: operation === 'AGENT_CORE_MEMORY_READ' ? 'agent_core_memory_read' : 'agent_core_memory_write',
      status,
      latencyMs,
      fallbackUsed: false,
      timedOut: false,
    });

    this.auditLog
      ?.recordSecurityEvent({
        traceId: context.traceId,
        userId: context.userId,
        operation: `${operation}_${status}`,
        resource: `AgentMemory:${key}`,
        after: errorMessage ? { error: errorMessage } : undefined,
      })
      .catch(() => undefined);
  }
}
