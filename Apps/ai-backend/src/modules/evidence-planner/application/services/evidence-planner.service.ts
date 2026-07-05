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
  EVIDENCE_FALLBACK_VERSION,
  EvidencePlanningEngine,
} from '../../domain/engine/evidence-planning.engine';
import { EvidenceRequirement } from '../../domain/engine/evidence-planning.types';
import { buildEvidencePrompt, EVIDENCE_PROMPT_VERSION } from '../prompts/evidence-prompt';
import { EvidencePlanRequest, EvidencePlanResponse } from '../contracts/evidence-planner.contracts';

/**
 * Evidence capability. Reads context only through ContextAssemblyService,
 * reaches the LLM only through ResilientLlmGateway, and always has a
 * deterministic fallback (EvidencePlanningEngine) so an evidence
 * requirement set is produced even when the LLM path is unavailable or
 * returns untrustworthy output.
 */
@Injectable()
export class EvidencePlannerService extends BasePlannerService<
  EvidencePlanRequest,
  EvidencePlanResponse
> {
  protected readonly capability = 'evidence_planner';
  protected readonly operationName = 'GENERATE_EVIDENCE_PLAN';
  protected readonly promptVersion = EVIDENCE_PROMPT_VERSION;

  private readonly fallbackEngine = new EvidencePlanningEngine();

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

  async planEvidence(request: EvidencePlanRequest): Promise<EvidencePlanResponse> {
    return this.execute(request);
  }

  protected buildPrompt(context: BrainContext): string {
    return buildEvidencePrompt(context);
  }

  protected buildTracedTo(context: BrainContext): string[] {
    return [
      `goal:${context.goalId}`,
      `roadmap:${context.roadmap.nodeId}`,
      `recommendation:${context.recommendation.state}`,
      `discovery:${context.userId}`,
    ];
  }

  protected emitMetrics(response: EvidencePlanResponse): void {
    this.metrics?.incrementEvidencePlanGenerated();
    this.metrics?.recordEvidencePlanConfidence(response.confidence);
    if (response.fallbackUsed) {
      this.metrics?.incrementEvidencePlanFallbackUsed();
    }
  }

  protected buildAuditEvent(
    _request: EvidencePlanRequest,
    response: EvidencePlanResponse,
  ): AuditEventDescriptor {
    return {
      operation: 'EVIDENCE_PLAN_GENERATED',
      resource: `Evidence:${response.evidenceId}`,
      after: {
        fallbackUsed: response.fallbackUsed,
        provider: response.provider,
        model: response.model,
        promptVersion: response.promptVersion,
        confidence: response.confidence,
        requirementCount: response.requirements.length,
      },
    };
  }

  protected buildResponse(context: BrainContext, gatewayResult: LlmGatewayResult): EvidencePlanResponse {
    return gatewayResult.fallbackUsed
      ? this.buildFallbackResponse(context, gatewayResult)
      : this.buildLlmResponse(context, gatewayResult);
  }

  private buildFallbackResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): EvidencePlanResponse {
    const plan = this.fallbackEngine.generate(context);
    return {
      ...plan,
      confidence: 0.5,
      explanation: `Deterministic fallback (${EVIDENCE_FALLBACK_VERSION}) used because: ${gatewayResult.fallbackReason ?? 'unknown'}.`,
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: true,
      promptVersion: EVIDENCE_PROMPT_VERSION,
    };
  }

  private buildLlmResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): EvidencePlanResponse {
    const raw = (gatewayResult.raw ?? {}) as Record<string, unknown>;
    const requirements = this.normalizeRequirements(raw.requirements);

    if (!requirements) {
      return this.buildFallbackResponse(context, {
        ...gatewayResult,
        fallbackUsed: true,
        fallbackReason: 'invalid_llm_output',
      });
    }

    const primaryRequirement =
      typeof raw.primaryRequirement === 'string' && raw.primaryRequirement.trim().length > 0
        ? raw.primaryRequirement
        : requirements[0].evidenceType;

    return {
      evidenceId: `evidence-${context.userId}-${context.assembledAt}`,
      userId: context.userId,
      requirements,
      primaryRequirement,
      confidence: this.normalizeConfidence(raw.confidence),
      explanation:
        typeof raw.reasoning === 'string' && raw.reasoning.trim().length > 0
          ? raw.reasoning
          : 'No reasoning provided by model',
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: false,
      promptVersion: EVIDENCE_PROMPT_VERSION,
    };
  }

  private normalizeRequirements(value: unknown): EvidenceRequirement[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;

    return value.map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      return {
        evidenceType:
          typeof r.evidenceType === 'string' && r.evidenceType.trim().length > 0
            ? r.evidenceType
            : 'untitled-evidence',
        description: typeof r.description === 'string' ? r.description : '',
        rationale: typeof r.rationale === 'string' ? r.rationale : '',
      };
    });
  }
}
