import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { IAgentContext, IAgentResult, IAgentVerifier } from '../domain/interfaces';

/**
 * Aggregates zero or more IAgentVerifier implementations. A result is valid
 * only if every registered verifier accepts it; with no verifiers registered
 * the pipeline is permissive (nothing to check yet). Every run emits a
 * structured log, a metric, and an audit event for the aggregate verdict.
 */
@Injectable()
export class VerificationPipelineService {
  private readonly verifiers: IAgentVerifier[] = [];

  constructor(
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  register(verifier: IAgentVerifier): void {
    this.verifiers.push(verifier);
  }

  async verify(result: IAgentResult, context: IAgentContext): Promise<boolean> {
    const startedAt = Date.now();
    const passed = await this.runVerifiers(result, context);
    const latencyMs = Date.now() - startedAt;
    const status = passed ? 'SUCCESS' : 'FAILURE';

    this.structuredLogger?.log({
      operation: 'AGENT_CORE_VERIFICATION_RUN',
      status,
      latencyMs,
      aggregateId: result.requestId,
      errorCode: passed ? undefined : 'VERIFICATION_REJECTED',
    });

    this.metrics?.recordPlannerOutcome?.({
      capability: 'agent_core_verification_pipeline',
      status,
      latencyMs,
      fallbackUsed: false,
      timedOut: false,
    });

    this.auditLog
      ?.recordSecurityEvent({
        traceId: context.traceId,
        userId: context.userId,
        operation: `AGENT_CORE_VERIFICATION_${status}`,
        resource: `AgentResult:${result.requestId}`,
        after: { verifierCount: this.verifiers.length, passed },
      })
      .catch(() => undefined);

    return passed;
  }

  private async runVerifiers(result: IAgentResult, context: IAgentContext): Promise<boolean> {
    for (const verifier of this.verifiers) {
      const passed = await verifier.verify(result, context);
      if (!passed) return false;
    }
    return true;
  }
}
