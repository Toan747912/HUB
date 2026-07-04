import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';
import { ContextAssemblyService } from '../../../../infrastructure/ai-brain/context-assembly.service';
import { ResilientLlmGateway } from '../../../../infrastructure/ai-brain/resilient-llm-gateway.service';
import { LlmGatewayResult } from '../../../../infrastructure/ai-brain/resilient-llm-gateway.types';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { ExplainabilityRulesService } from '../../../../shared/services/explainability-rules.service';
import {
  DISCOVERY_FALLBACK_VERSION,
  DiscoveryPlanningEngine,
} from '../../domain/engine/discovery-planning.engine';
import { DiscoverySuggestion } from '../../domain/engine/discovery-planning.types';
import { buildDiscoveryPrompt, DISCOVERY_PROMPT_VERSION } from '../prompts/discovery-prompt';
import { DiscoveryPlanRequest, DiscoveryPlanResponse } from '../contracts/discovery-planner.contracts';

const CAPABILITY = 'discovery_planner';
const DEFAULT_PROVIDER = 'mock-llm';
const DEFAULT_MODEL = 'mock-llm-v1';

/**
 * Discovery capability. Reads context only through ContextAssemblyService,
 * reaches the LLM only through ResilientLlmGateway, and always has a
 * deterministic fallback (DiscoveryPlanningEngine) so an onboarding suggestion
 * set is produced even when the LLM path is unavailable or returns
 * untrustworthy output.
 */
@Injectable()
export class DiscoveryPlannerService {
  private readonly fallbackEngine = new DiscoveryPlanningEngine();

  constructor(
    private readonly contextAssembly: ContextAssemblyService,
    private readonly llmGateway: ResilientLlmGateway,
    private readonly explainabilityRules: ExplainabilityRulesService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async discoverInitialFocus(request: DiscoveryPlanRequest): Promise<DiscoveryPlanResponse> {
    const start = Date.now();
    const provider = request.provider ?? DEFAULT_PROVIDER;
    const model = request.model ?? DEFAULT_MODEL;

    try {
      const context = await this.contextAssembly.assemble({
        userId: request.userId,
        goalId: request.goalId,
        sessionId: request.sessionId,
        traceId: request.traceId,
      });

      const gatewayResult = await this.llmGateway.complete({
        capability: CAPABILITY,
        provider,
        model,
        prompt: buildDiscoveryPrompt(context),
        promptVersion: DISCOVERY_PROMPT_VERSION,
      });

      const response = gatewayResult.fallbackUsed
        ? this.buildFallbackResponse(context, gatewayResult)
        : this.buildLlmResponse(context, gatewayResult);

      this.explainabilityRules.validate({
        confidence: response.confidence,
        reasoning: response.explanation,
        traced_to: [
          `discovery:${context.userId}`,
          `goal:${context.goalId}`,
          `recommendation:${context.recommendation.state}`,
        ],
      });

      await this.emitObservability(request, response, start, 'SUCCESS');
      return response;
    } catch (error) {
      await this.emitObservability(request, null, start, 'FAILURE', error);
      throw error;
    }
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

  private normalizeConfidence(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  private async emitObservability(
    request: DiscoveryPlanRequest,
    response: DiscoveryPlanResponse | null,
    startMs: number,
    status: 'SUCCESS' | 'FAILURE',
    error?: unknown,
  ): Promise<void> {
    console.log(
      JSON.stringify({
        traceId: request.traceId,
        operation: 'GENERATE_DISCOVERY_PLAN',
        capability: CAPABILITY,
        userId: request.userId,
        goalId: request.goalId,
        latencyMs: Date.now() - startMs,
        status,
        fallbackUsed: response?.fallbackUsed,
        confidence: response?.confidence,
        errorType: error instanceof Error ? error.constructor.name : undefined,
        timestamp: new Date().toISOString(),
      }),
    );

    if (status !== 'SUCCESS' || !response) return;

    this.metrics?.incrementDiscoveryPlanGenerated();
    this.metrics?.recordDiscoveryPlanConfidence(response.confidence);
    if (response.fallbackUsed) {
      this.metrics?.incrementDiscoveryPlanFallbackUsed();
    }

    await this.auditLog
      ?.recordSecurityEvent({
        traceId: request.traceId,
        userId: request.userId,
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
      })
      .catch(() => undefined);
  }
}
