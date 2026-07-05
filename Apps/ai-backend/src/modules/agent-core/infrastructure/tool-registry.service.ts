import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { IAgentTool } from '../domain/interfaces';

/**
 * In-process IAgentTool lookup used by RuntimeExecutor. Registration and
 * resolution both emit a structured log, a metric, and an audit event, same
 * as the production Tool Framework registry (agent-tools/ToolRegistryService).
 */
@Injectable()
export class ToolRegistryService {
  private readonly tools = new Map<string, IAgentTool>();

  constructor(
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  register(tool: IAgentTool): void {
    this.tools.set(tool.name, tool);

    this.structuredLogger?.log({
      operation: 'AGENT_CORE_TOOL_REGISTER',
      status: 'SUCCESS',
      latencyMs: 0,
      aggregateId: tool.name,
    });
    this.auditLog
      ?.recordSecurityEvent({
        traceId: 'system',
        userId: null,
        operation: 'AGENT_CORE_TOOL_REGISTER',
        resource: `AgentTool:${tool.name}`,
      })
      .catch(() => undefined);
  }

  get(name: string): IAgentTool | undefined {
    const tool = this.tools.get(name);
    const status = tool ? 'SUCCESS' : 'FAILURE';

    this.structuredLogger?.log({
      operation: 'AGENT_CORE_TOOL_RESOLVE',
      status,
      latencyMs: 0,
      aggregateId: name,
      errorCode: tool ? undefined : 'TOOL_NOT_FOUND',
    });
    this.metrics?.recordPlannerOutcome?.({
      capability: `agent_core_tool_resolve_${name}`,
      status,
      latencyMs: 0,
      fallbackUsed: false,
      timedOut: false,
    });
    if (!tool) {
      this.auditLog
        ?.recordSecurityEvent({
          traceId: 'system',
          userId: null,
          operation: 'AGENT_CORE_TOOL_RESOLVE_FAILURE',
          resource: `AgentTool:${name}`,
          after: { error: 'TOOL_NOT_FOUND' },
        })
        .catch(() => undefined);
    }

    return tool;
  }
}
