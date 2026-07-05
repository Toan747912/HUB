import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import {
  AuditEventDescriptor,
  BasePlannerService,
} from '../../../../infrastructure/ai-brain/base-planner.service';
import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';
import { ContextAssemblyService } from '../../../../infrastructure/ai-brain/context-assembly.service';
import { ResilientLlmGateway } from '../../../../infrastructure/ai-brain/resilient-llm-gateway.service';
import { LlmGatewayResult } from '../../../../infrastructure/ai-brain/resilient-llm-gateway.types';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../../infrastructure/observability/structured-logger.service';
import { ExplainabilityRulesService } from '../../../../shared/services/explainability-rules.service';
import {
  TEACHING_FALLBACK_VERSION,
  TeachingPlanningEngine,
} from '../../domain/engine/teaching-planning.engine';
import { TeachingAction } from '../../domain/engine/teaching-planning.types';
import { buildTeachingPrompt, TEACHING_PROMPT_VERSION } from '../prompts/teaching-prompt';
import { TeachingPlanRequest, TeachingPlanResponse } from '../contracts/teaching-planner.contracts';

/**
 * Teaching capability. Reads context only through ContextAssemblyService,
 * reaches the LLM only through ResilientLlmGateway, and always has a
 * deterministic fallback (TeachingPlanningEngine) so a teaching action set
 * is produced even when the LLM path is unavailable or returns
 * untrustworthy output.
 */
@Injectable()
export class TeachingPlannerService extends BasePlannerService<
  TeachingPlanRequest,
  TeachingPlanResponse
> {
  protected readonly capability = 'teaching_planner';
  protected readonly operationName = 'GENERATE_TEACHING_PLAN';
  protected readonly promptVersion = TEACHING_PROMPT_VERSION;

  private readonly fallbackEngine = new TeachingPlanningEngine();

  constructor(
    contextAssembly: ContextAssemblyService,
    llmGateway: ResilientLlmGateway,
    explainabilityRules: ExplainabilityRulesService,
    metrics?: MetricsService,
    auditLog?: AuditLogService,
    structuredLogger?: StructuredLoggerService,
  ) {
    super(contextAssembly, llmGateway, explainabilityRules, metrics, auditLog, structuredLogger);
  }

  async planTeaching(request: TeachingPlanRequest): Promise<TeachingPlanResponse> {
    return this.execute(request);
  }

  protected buildPrompt(context: BrainContext): string {
    return buildTeachingPrompt(context);
  }

  protected buildTracedTo(context: BrainContext): string[] {
    return [
      `goal:${context.goalId}`,
      `roadmap:${context.roadmap.nodeId}`,
      `recommendation:${context.recommendation.state}`,
      `discovery:${context.userId}`,
    ];
  }

  protected emitMetrics(response: TeachingPlanResponse): void {
    this.metrics?.incrementTeachingPlanGenerated();
    this.metrics?.recordTeachingPlanConfidence(response.confidence);
    if (response.fallbackUsed) {
      this.metrics?.incrementTeachingPlanFallbackUsed();
    }
  }

  protected buildAuditEvent(
    _request: TeachingPlanRequest,
    response: TeachingPlanResponse,
  ): AuditEventDescriptor {
    return {
      operation: 'TEACHING_PLAN_GENERATED',
      resource: `Teaching:${response.teachingId}`,
      after: {
        fallbackUsed: response.fallbackUsed,
        provider: response.provider,
        model: response.model,
        promptVersion: response.promptVersion,
        confidence: response.confidence,
        actionCount: response.actions.length,
      },
    };
  }

  protected buildResponse(context: BrainContext, gatewayResult: LlmGatewayResult): TeachingPlanResponse {
    return gatewayResult.fallbackUsed
      ? this.buildFallbackResponse(context, gatewayResult)
      : this.buildLlmResponse(context, gatewayResult);
  }

  private buildFallbackResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): TeachingPlanResponse {
    const plan = this.fallbackEngine.generate(context);
    return {
      ...plan,
      confidence: 0.5,
      explanation: `Deterministic fallback (${TEACHING_FALLBACK_VERSION}) used because: ${gatewayResult.fallbackReason ?? 'unknown'}.`,
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: true,
      promptVersion: TEACHING_PROMPT_VERSION,
    };
  }

  private buildLlmResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): TeachingPlanResponse {
    const raw = (gatewayResult.raw ?? {}) as Record<string, unknown>;
    const actions = this.normalizeActions(raw.actions);

    if (!actions) {
      return this.buildFallbackResponse(context, {
        ...gatewayResult,
        fallbackUsed: true,
        fallbackReason: 'invalid_llm_output',
      });
    }

    const primaryAction =
      typeof raw.primaryAction === 'string' && raw.primaryAction.trim().length > 0
        ? raw.primaryAction
        : actions[0].actionType;

    return {
      teachingId: `teaching-${context.userId}-${context.assembledAt}`,
      userId: context.userId,
      actions,
      primaryAction,
      confidence: this.normalizeConfidence(raw.confidence),
      explanation:
        typeof raw.reasoning === 'string' && raw.reasoning.trim().length > 0
          ? raw.reasoning
          : 'No reasoning provided by model',
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: false,
      promptVersion: TEACHING_PROMPT_VERSION,
    };
  }

  private normalizeActions(value: unknown): TeachingAction[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;

    return value.map((raw) => {
      const a = (raw ?? {}) as Record<string, unknown>;
      return {
        actionType:
          typeof a.actionType === 'string' && a.actionType.trim().length > 0
            ? a.actionType
            : 'untitled-action',
        description: typeof a.description === 'string' ? a.description : '',
        rationale: typeof a.rationale === 'string' ? a.rationale : '',
      };
    });
  }
}
