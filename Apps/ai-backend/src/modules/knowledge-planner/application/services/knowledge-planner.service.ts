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
  KNOWLEDGE_FALLBACK_VERSION,
  KnowledgePlanningEngine,
} from '../../domain/engine/knowledge-planning.engine';
import { KnowledgeRecommendation } from '../../domain/engine/knowledge-planning.types';
import { buildKnowledgePrompt, KNOWLEDGE_PROMPT_VERSION } from '../prompts/knowledge-prompt';
import { KnowledgePlanRequest, KnowledgePlanResponse } from '../contracts/knowledge-planner.contracts';

/**
 * Knowledge capability. Reads context only through ContextAssemblyService,
 * reaches the LLM only through ResilientLlmGateway, and always has a
 * deterministic fallback (KnowledgePlanningEngine) so a knowledge
 * recommendation set is produced even when the LLM path is unavailable or
 * returns untrustworthy output.
 */
@Injectable()
export class KnowledgePlannerService extends BasePlannerService<
  KnowledgePlanRequest,
  KnowledgePlanResponse
> {
  protected readonly capability = 'knowledge_planner';
  protected readonly operationName = 'GENERATE_KNOWLEDGE_PLAN';
  protected readonly promptVersion = KNOWLEDGE_PROMPT_VERSION;

  private readonly fallbackEngine = new KnowledgePlanningEngine();

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

  async recommendKnowledge(request: KnowledgePlanRequest): Promise<KnowledgePlanResponse> {
    return this.execute(request);
  }

  protected buildPrompt(context: BrainContext): string {
    return buildKnowledgePrompt(context);
  }

  protected buildTracedTo(context: BrainContext): string[] {
    return [
      `goal:${context.goalId}`,
      `roadmap:${context.roadmap.nodeId}`,
      `recommendation:${context.recommendation.state}`,
      `discovery:${context.userId}`,
    ];
  }

  protected emitMetrics(response: KnowledgePlanResponse): void {
    this.metrics?.incrementKnowledgePlanGenerated();
    this.metrics?.recordKnowledgePlanConfidence(response.confidence);
    if (response.fallbackUsed) {
      this.metrics?.incrementKnowledgePlanFallbackUsed();
    }
  }

  protected buildAuditEvent(
    _request: KnowledgePlanRequest,
    response: KnowledgePlanResponse,
  ): AuditEventDescriptor {
    return {
      operation: 'KNOWLEDGE_PLAN_GENERATED',
      resource: `Knowledge:${response.knowledgeId}`,
      after: {
        fallbackUsed: response.fallbackUsed,
        provider: response.provider,
        model: response.model,
        promptVersion: response.promptVersion,
        confidence: response.confidence,
        recommendationCount: response.recommendations.length,
      },
    };
  }

  protected buildResponse(context: BrainContext, gatewayResult: LlmGatewayResult): KnowledgePlanResponse {
    return gatewayResult.fallbackUsed
      ? this.buildFallbackResponse(context, gatewayResult)
      : this.buildLlmResponse(context, gatewayResult);
  }

  private buildFallbackResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): KnowledgePlanResponse {
    const plan = this.fallbackEngine.generate(context);
    return {
      ...plan,
      confidence: 0.5,
      explanation: `Deterministic fallback (${KNOWLEDGE_FALLBACK_VERSION}) used because: ${gatewayResult.fallbackReason ?? 'unknown'}.`,
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: true,
      promptVersion: KNOWLEDGE_PROMPT_VERSION,
    };
  }

  private buildLlmResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): KnowledgePlanResponse {
    const raw = (gatewayResult.raw ?? {}) as Record<string, unknown>;
    const recommendations = this.normalizeRecommendations(raw.recommendations);

    if (!recommendations) {
      return this.buildFallbackResponse(context, {
        ...gatewayResult,
        fallbackUsed: true,
        fallbackReason: 'invalid_llm_output',
      });
    }

    const primaryTopic =
      typeof raw.primaryTopic === 'string' && raw.primaryTopic.trim().length > 0
        ? raw.primaryTopic
        : recommendations[0].topic;

    return {
      knowledgeId: `knowledge-${context.userId}-${context.assembledAt}`,
      userId: context.userId,
      recommendations,
      primaryTopic,
      confidence: this.normalizeConfidence(raw.confidence),
      explanation:
        typeof raw.reasoning === 'string' && raw.reasoning.trim().length > 0
          ? raw.reasoning
          : 'No reasoning provided by model',
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: false,
      promptVersion: KNOWLEDGE_PROMPT_VERSION,
    };
  }

  private normalizeRecommendations(value: unknown): KnowledgeRecommendation[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;

    return value.map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      return {
        topic: typeof r.topic === 'string' && r.topic.trim().length > 0 ? r.topic : 'Untitled topic',
        resourceType:
          typeof r.resourceType === 'string' && r.resourceType.trim().length > 0
            ? r.resourceType
            : 'general-resource',
        rationale: typeof r.rationale === 'string' ? r.rationale : '',
      };
    });
  }
}
