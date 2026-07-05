import { AuditLogService } from '../audit/audit-log.service';
import { ExplainabilityRulesService } from '../../shared/services/explainability-rules.service';
import { MetricsService } from '../observability/metrics.service';
import { StructuredLoggerService } from '../observability/structured-logger.service';
import { BrainContext } from './brain-context.types';
import { ContextAssemblyService } from './context-assembly.service';
import { PlannerExecutionError } from './planner-execution-error';
import { ResilientLlmGateway } from './resilient-llm-gateway.service';
import { LlmGatewayResult } from './resilient-llm-gateway.types';

const LLM_TIMEOUT_FALLBACK_REASON = 'llm_unavailable_or_timeout';

export interface BasePlanRequest {
  userId: string;
  goalId: string;
  sessionId: string;
  traceId: string;
  provider?: string;
  model?: string;
}

export interface BasePlanResponse {
  confidence: number;
  explanation: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  promptVersion: string;
}

export interface AuditEventDescriptor {
  operation: string;
  resource: string;
  after: Record<string, unknown>;
}

/**
 * Encapsulates the execution pipeline shared by every AI Brain planner:
 * assemble context -> invoke gateway -> normalize/fallback -> validate
 * explainability -> emit metrics/audit/logs. Planner-specific concerns
 * (prompts, fallback engines, response shape, metric/audit names) stay in
 * the subclasses via the abstract hooks below.
 */
export abstract class BasePlannerService<
  TRequest extends BasePlanRequest,
  TResponse extends BasePlanResponse,
> {
  protected readonly defaultProvider: string = 'mock-llm';
  protected readonly defaultModel: string = 'mock-llm-v1';

  protected abstract readonly capability: string;
  protected abstract readonly operationName: string;
  protected abstract readonly promptVersion: string;

  constructor(
    protected readonly contextAssembly: ContextAssemblyService,
    protected readonly llmGateway: ResilientLlmGateway,
    protected readonly explainabilityRules: ExplainabilityRulesService,
    protected readonly metrics?: MetricsService,
    protected readonly auditLog?: AuditLogService,
    protected readonly structuredLogger?: StructuredLoggerService,
  ) {}

  protected abstract buildPrompt(context: BrainContext): string;
  protected abstract buildResponse(context: BrainContext, gatewayResult: LlmGatewayResult): TResponse;
  protected abstract buildTracedTo(context: BrainContext): string[];
  protected abstract emitMetrics(response: TResponse): void;
  protected abstract buildAuditEvent(request: TRequest, response: TResponse): AuditEventDescriptor;

  protected normalizeConfidence(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  protected async execute(request: TRequest): Promise<TResponse> {
    const start = Date.now();
    const provider = request.provider ?? this.defaultProvider;
    const model = request.model ?? this.defaultModel;

    try {
      const context = await this.contextAssembly.assemble({
        userId: request.userId,
        goalId: request.goalId,
        sessionId: request.sessionId,
        traceId: request.traceId,
      });

      const gatewayResult = await this.llmGateway.complete({
        capability: this.capability,
        provider,
        model,
        prompt: this.buildPrompt(context),
        promptVersion: this.promptVersion,
      });

      const response = this.buildResponse(context, gatewayResult);

      this.explainabilityRules.validate({
        confidence: response.confidence,
        reasoning: response.explanation,
        traced_to: this.buildTracedTo(context),
      });

      await this.emitObservability(request, response, start, 'SUCCESS', {
        provider,
        model,
        fallbackReason: gatewayResult.fallbackReason,
      });
      return response;
    } catch (error) {
      await this.emitObservability(request, null, start, 'FAILURE', { provider, model }, error);
      if (error instanceof PlannerExecutionError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new PlannerExecutionError(this.capability, message, error);
    }
  }

  private async emitObservability(
    request: TRequest,
    response: TResponse | null,
    startMs: number,
    status: 'SUCCESS' | 'FAILURE',
    gatewayInfo: { provider: string; model: string; fallbackReason?: string },
    error?: unknown,
  ): Promise<void> {
    const latencyMs = Date.now() - startMs;

    this.structuredLogger?.logPlannerExecution({
      traceId: request.traceId,
      userId: request.userId,
      goalId: request.goalId,
      sessionId: request.sessionId,
      capability: this.capability,
      operation: this.operationName,
      provider: response?.provider ?? gatewayInfo.provider,
      model: response?.model ?? gatewayInfo.model,
      promptVersion: response?.promptVersion ?? this.promptVersion,
      fallbackUsed: response?.fallbackUsed,
      latencyMs,
      confidence: response?.confidence,
      status,
      errorType: error instanceof Error ? error.constructor.name : undefined,
    });

    this.metrics?.recordPlannerOutcome?.({
      capability: this.capability,
      status,
      latencyMs,
      confidence: response?.confidence,
      fallbackUsed: response?.fallbackUsed ?? false,
      timedOut: gatewayInfo.fallbackReason === LLM_TIMEOUT_FALLBACK_REASON,
    });

    if (status !== 'SUCCESS' || !response) return;

    this.emitMetrics(response);

    const auditEvent = this.buildAuditEvent(request, response);
    await this.auditLog
      ?.recordSecurityEvent({
        traceId: request.traceId,
        userId: request.userId,
        operation: auditEvent.operation,
        resource: auditEvent.resource,
        after: auditEvent.after,
      })
      .catch(() => undefined);
  }
}
