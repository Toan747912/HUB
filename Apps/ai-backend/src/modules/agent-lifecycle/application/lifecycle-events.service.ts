import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { AgentInstance, LifecycleEventType } from '../domain/lifecycle.types';

const FAILURE_EVENTS: ReadonlySet<LifecycleEventType> = new Set([
  LifecycleEventType.STEP_FAILED,
  LifecycleEventType.AGENT_FAILED,
]);

/**
 * Emits every lifecycle transition as a structured log line, a metric, and a
 * durable audit event - mirroring RuntimeExecutor's emitObservability pattern
 * so lifecycle changes are exactly as observable as workflow steps.
 */
@Injectable()
export class LifecycleEventsService {
  constructor(
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  emit(eventType: LifecycleEventType, instance: AgentInstance, extra?: Record<string, unknown>): void {
    const status = FAILURE_EVENTS.has(eventType) ? 'FAILURE' : 'SUCCESS';

    this.structuredLogger?.log({
      operation: eventType,
      status,
      latencyMs: 0,
      aggregateId: instance.instanceId,
      errorCode: status === 'FAILURE' ? instance.lastError ?? undefined : undefined,
    });

    this.metrics?.recordPlannerOutcome?.({
      capability: `agent_lifecycle_${eventType.toLowerCase()}`,
      status,
      latencyMs: 0,
      fallbackUsed: false,
      timedOut: false,
    });

    void this.auditLog
      ?.recordSecurityEvent({
        traceId: instance.traceId,
        userId: instance.userId,
        operation: eventType,
        resource: `AgentInstance:${instance.instanceId}`,
        after: {
          status: instance.status,
          currentStep: instance.currentStep,
          agentId: instance.agentId,
          workflowId: instance.workflowId,
          ...extra,
        },
      })
      .catch(() => undefined);
  }
}
