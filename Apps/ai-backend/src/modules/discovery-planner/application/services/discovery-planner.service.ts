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
  DISCOVERY_FALLBACK_VERSION,
  DiscoveryPlanningEngine,
} from '../../domain/engine/discovery-planning.engine';
import { DiscoverySuggestion } from '../../domain/engine/discovery-planning.types';
import { buildDiscoveryPrompt, DISCOVERY_PROMPT_VERSION } from '../prompts/discovery-prompt';
import { DiscoveryPlanRequest, DiscoveryPlanResponse } from '../contracts/discovery-planner.contracts';

/**
 * Discovery capability. Reads context only through ContextAssemblyService,
 * reaches the LLM only through ResilientLlmGateway, and always has a
 * deterministic fallback (DiscoveryPlanningEngine) so an onboarding suggestion
 * set is produced even when the LLM path is unavailable or returns
 * untrustworthy output.
 */
@Injectable()
export class DiscoveryPlannerService extends BasePlannerService<
  DiscoveryPlanRequest,
  DiscoveryPlanResponse
> {
  protected readonly capability = 'discovery_planner';
  protected readonly operationName = 'GENERATE_DISCOVERY_PLAN';
  protected readonly promptVersion = DISCOVERY_PROMPT_VERSION;

  private readonly fallbackEngine = new DiscoveryPlanningEngine();

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

  async discoverInitialFocus(request: DiscoveryPlanRequest): Promise<DiscoveryPlanResponse> {
    return this.execute(request);
  }

  protected buildPrompt(context: BrainContext): string {
    return buildDiscoveryPrompt(context);
  }

  protected buildTracedTo(context: BrainContext): string[] {
    return [
      `discovery:${context.userId}`,
      `goal:${context.goalId}`,
      `recommendation:${context.recommendation.state}`,
    ];
  }

  protected emitMetrics(response: DiscoveryPlanResponse): void {
    this.metrics?.incrementDiscoveryPlanGenerated();
    this.metrics?.recordDiscoveryPlanConfidence(response.confidence);
    if (response.fallbackUsed) {
      this.metrics?.incrementDiscoveryPlanFallbackUsed();
    }
  }

  protected buildAuditEvent(
    _request: DiscoveryPlanRequest,
    response: DiscoveryPlanResponse,
  ): AuditEventDescriptor {
    return {
      operation: 'DISCOVERY_PLAN_GENERATED',
      resource: `Discovery:${response.discoveryId}`,
      after: {
        fallbackUsed: response.fallbackUsed,
        provider: response.provider,
        model: response.model,
        promptVersion: response.promptVersion,
        confidence: response.confidence,
        suggestionCount: response.suggestions.length,
      },
    };
  }

  protected buildResponse(context: BrainContext, gatewayResult: LlmGatewayResult): DiscoveryPlanResponse {
    return gatewayResult.fallbackUsed
      ? this.buildFallbackResponse(context, gatewayResult)
      : this.buildLlmResponse(context, gatewayResult);
  }

  private buildFallbackResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): DiscoveryPlanResponse {
    const plan = this.fallbackEngine.generate(context);
    return {
      ...plan,
      confidence: 0.5,
      explanation: `Deterministic fallback (${DISCOVERY_FALLBACK_VERSION}) used because: ${gatewayResult.fallbackReason ?? 'unknown'}.`,
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: true,
      promptVersion: DISCOVERY_PROMPT_VERSION,
    };
  }

  private buildLlmResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): DiscoveryPlanResponse {
    const raw = (gatewayResult.raw ?? {}) as Record<string, unknown>;
    const suggestions = this.normalizeSuggestions(raw.suggestions);

    if (!suggestions) {
      return this.buildFallbackResponse(context, {
        ...gatewayResult,
        fallbackUsed: true,
        fallbackReason: 'invalid_llm_output',
      });
    }

    const primaryFocus =
      typeof raw.primaryFocus === 'string' && raw.primaryFocus.trim().length > 0
        ? raw.primaryFocus
        : suggestions[0].skillFocus;

    return {
      discoveryId: `discovery-${context.userId}-${context.assembledAt}`,
      userId: context.userId,
      suggestions,
      primaryFocus,
      confidence: this.normalizeConfidence(raw.confidence),
      explanation:
        typeof raw.reasoning === 'string' && raw.reasoning.trim().length > 0
          ? raw.reasoning
          : 'No reasoning provided by model',
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: false,
      promptVersion: DISCOVERY_PROMPT_VERSION,
    };
  }

  private normalizeSuggestions(value: unknown): DiscoverySuggestion[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;

    return value.map((raw) => {
      const s = (raw ?? {}) as Record<string, unknown>;
      return {
        goalArea: typeof s.goalArea === 'string' && s.goalArea.trim().length > 0 ? s.goalArea : 'Untitled goal area',
        skillFocus:
          typeof s.skillFocus === 'string' && s.skillFocus.trim().length > 0
            ? s.skillFocus
            : 'general-skill',
        rationale: typeof s.rationale === 'string' ? s.rationale : '',
      };
    });
  }
}
