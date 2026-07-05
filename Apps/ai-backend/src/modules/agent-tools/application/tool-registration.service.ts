import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { IAgentContext } from '../../agent-core/domain/interfaces';
import { ToolCategory, ToolMetadata, validateAgainstSchema } from '../domain/tool-metadata';
import { IAgentTool, ToolErrorCode, ToolExecutionError, ToolExecutionResult } from '../domain/tool.types';

/**
 * Registry + executor for the production Tool Framework. Every execution -
 * success or failure - emits a structured log, a metric, and an audit event,
 * mirroring the observability shape RuntimeExecutor already uses for steps.
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
    if (this.tools.has(tool.metadata.id)) {
      throw new ToolExecutionError(
        ToolErrorCode.DUPLICATE_TOOL,
        `Tool already registered: ${tool.metadata.id}`,
        tool.metadata.id,
      );
    }
    this.tools.set(tool.metadata.id, tool);
  }

  unregister(id: string): boolean {
    return this.tools.delete(id);
  }

  find(id: string): IAgentTool | undefined {
    return this.tools.get(id);
  }

  list(category?: ToolCategory): ToolMetadata[] {
    const all = Array.from(this.tools.values()).map((tool) => tool.metadata);
    return category ? all.filter((metadata) => metadata.category === category) : all;
  }

  async execute(
    id: string,
    input: Record<string, unknown>,
    context: IAgentContext,
  ): Promise<ToolExecutionResult> {
    const startedAt = Date.now();
    const tool = this.tools.get(id);

    if (!tool) {
      return this.finalize(id, context, startedAt, {
        status: 'FAILURE',
        error: { code: ToolErrorCode.TOOL_NOT_FOUND, message: `Tool not registered: ${id}` },
      });
    }

    const validationErrors = validateAgainstSchema(input, tool.metadata.inputSchema);
    if (validationErrors.length > 0) {
      return this.finalize(id, context, startedAt, {
        status: 'FAILURE',
        error: { code: ToolErrorCode.INVALID_INPUT, message: validationErrors.join('; ') },
      });
    }

    try {
      const output = await tool.execute(input, context);
      return this.finalize(id, context, startedAt, { status: 'SUCCESS', output });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.finalize(id, context, startedAt, {
        status: 'FAILURE',
        error: { code: ToolErrorCode.EXECUTION_FAILED, message },
      });
    }
  }

  private async finalize(
    id: string,
    context: IAgentContext,
    startedAt: number,
    partial: Pick<ToolExecutionResult, 'status' | 'output' | 'error'>,
  ): Promise<ToolExecutionResult> {
    const durationMs = Date.now() - startedAt;
    const result: ToolExecutionResult = { toolId: id, durationMs, ...partial };

    this.structuredLogger?.log({
      operation: 'AGENT_TOOL_EXECUTE',
      status: result.status,
      latencyMs: durationMs,
      aggregateId: id,
      errorCode: result.error?.code,
    });

    this.metrics?.recordPlannerOutcome?.({
      capability: `agent_tool_${id}`,
      status: result.status,
      latencyMs: durationMs,
      fallbackUsed: false,
      timedOut: false,
    });

    await this.auditLog
      ?.recordSecurityEvent({
        traceId: context.traceId,
        userId: context.userId ?? null,
        operation: `AGENT_TOOL_${result.status}`,
        resource: `AgentTool:${id}`,
        after: { status: result.status, latencyMs: durationMs, errorCode: result.error?.code },
      })
      .catch(() => undefined);

    return result;
  }
}
