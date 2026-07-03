import { Injectable } from '@nestjs/common';
import { ExplainableAiOutput } from '../../domain/ai.types';
import { MockLlmClientService } from '../../infrastructure/llm/mock-llm-client.service';
import { DomainBoundaryGuardService } from '../../shared/services/domain-boundary-guard.service';
import { ExplainabilityRulesService } from '../../shared/services/explainability-rules.service';
import { AssessmentService } from '../assessment/assessment.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { EvidenceService } from '../evidence/evidence.service';
import { GoalService } from '../goal/goal.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { LearningSessionService } from '../learning-session/learning-session.service';
import { RecommendationService } from '../recommendation/recommendation.service';
import { RoadmapService } from '../roadmap/roadmap.service';
import { TeachingService } from '../teaching/teaching.service';
import { AiExecuteDto } from './dto/ai-execute.dto';

@Injectable()
export class AiRuntimeService {
  private llmFailureCount = 0;
  private circuitOpenUntil = 0;
  private readonly circuitFailureThreshold = 3;
  private readonly circuitCooldownMs = 15_000;
  private readonly llmTimeoutMs = 8_000;
  constructor(
    private readonly llm: MockLlmClientService,
    private readonly boundaryGuard: DomainBoundaryGuardService,
    private readonly explainabilityRules: ExplainabilityRulesService,
    private readonly goalService: GoalService,
    private readonly roadmapService: RoadmapService,
    private readonly learningSessionService: LearningSessionService,
    private readonly knowledgeService: KnowledgeService,
    private readonly evidenceService: EvidenceService,
    private readonly assessmentService: AssessmentService,
    private readonly recommendationService: RecommendationService,
    private readonly discoveryService: DiscoveryService,
    private readonly teachingService: TeachingService,
  ) {}

  async execute(
    dto: AiExecuteDto,
  ): Promise<{ route: string; output: ExplainableAiOutput; context: Record<string, unknown> }> {
    this.boundaryGuard.enforceNoCrossDomainWrite(dto.route, dto.attempted_writes ?? []);

    const domainContext = await this.buildDomainContext(dto);
    const promptText = dto?.input?.prompt ?? '';

    if (this.isTestMode() && promptText.includes('__TEST_THROW_UNKNOWN__')) {
      throw new Error('TEST_UNKNOWN_RUNTIME_EXCEPTION');
    }

    const llmPrompt = JSON.stringify({
      route: dto.route,
      input: { ...(dto.input ?? {}), prompt: promptText },
      context: dto.context ?? {},
      memory: dto.memory ?? [],
      domainContext,
    });

    const rawOutput = await this.callLlmWithResilience(
      llmPrompt,
      dto.route,
      domainContext,
      promptText,
    );
    const output = this.normalizeExplainableOutput(rawOutput, dto.route, domainContext);

    return {
      route: dto.route,
      output,
      context: domainContext,
    };
  }

  private async buildDomainContext(dto: AiExecuteDto): Promise<Record<string, unknown>> {
    const prompt = dto?.input?.prompt ?? '';
    const userId = this.extractToken(prompt, 'user:') ?? 'u-default';
    const sessionId = this.extractToken(prompt, 'session:') ?? 's-default';
    const goalId = this.extractToken(prompt, 'goal:') ?? 'g-default';

    switch (dto.route) {
      case 'goal':
        return { goal: await this.goalService.getGoal(goalId) };
      case 'roadmap':
        return { roadmap: await this.roadmapService.getRoadmapSlice(goalId) };
      case 'learning_session':
        return { session: await this.learningSessionService.getSession(sessionId) };
      case 'knowledge':
        return { knowledge: await this.knowledgeService.getKnowledgeSubset(goalId) };
      case 'evidence':
        return { evidence: await this.evidenceService.getEvidenceSignals(sessionId) };
      case 'assessment':
        return { assessment: await this.assessmentService.getAssessmentHistory(sessionId) };
      case 'recommendation':
        return { recommendation: await this.recommendationService.getRecommendationState(userId) };
      case 'discovery':
        return { discovery: await this.discoveryService.getDiscoveryContext(userId) };
      case 'teaching':
        return { teaching: await this.teachingService.getTeachingContext(sessionId) };
      default:
        return {};
    }
  }

  private async callLlmWithResilience(
    prompt: string,
    route: string,
    context: Record<string, unknown>,
    rawPromptText?: string,
  ): Promise<unknown> {
    if (this.isCircuitOpen()) {
      return this.buildFallbackOutput(
        route,
        context,
        'Circuit breaker open - using fallback response',
      );
    }

    const testMode = this.isTestMode();
    const forceTimeout = testMode && (rawPromptText?.includes('__TEST_TIMEOUT__') ?? false);
    const forceInvalidLlm = testMode && (rawPromptText?.includes('__TEST_INVALID_LLM__') ?? false);
    const forceCircuitFail =
      testMode && (rawPromptText?.includes('__TEST_CIRCUIT_FAIL__') ?? false);
    const forceCircuitRecover =
      testMode && (rawPromptText?.includes('__TEST_CIRCUIT_RECOVER__') ?? false);

    if (forceCircuitRecover) {
      this.circuitOpenUntil = 0;
      this.llmFailureCount = 0;
    }

    if (forceInvalidLlm) {
      return 'INVALID_LLM_OUTPUT';
    }

    if (forceCircuitFail) {
      this.llmFailureCount += 1;
      if (this.llmFailureCount >= this.circuitFailureThreshold) {
        this.circuitOpenUntil = Date.now() + this.circuitCooldownMs;
      }
      return this.buildFallbackOutput(
        route,
        context,
        'LLM unavailable or timed out - using fallback response',
      );
    }

    try {
      const llmResult = forceTimeout
        ? await this.withTimeout(
            new Promise<unknown>((resolve) => {
              setTimeout(() => resolve({ delayed: true }), this.llmTimeoutMs + 50);
            }),
            this.llmTimeoutMs,
          )
        : await this.withTimeout(this.llm.complete(prompt), this.llmTimeoutMs);

      this.llmFailureCount = 0;
      return llmResult;
    } catch {
      this.llmFailureCount += 1;
      if (this.llmFailureCount >= this.circuitFailureThreshold) {
        this.circuitOpenUntil = Date.now() + this.circuitCooldownMs;
      }
      return this.buildFallbackOutput(
        route,
        context,
        'LLM unavailable or timed out - using fallback response',
      );
    }
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil <= 0) return false;
    if (Date.now() >= this.circuitOpenUntil) {
      this.circuitOpenUntil = 0;
      this.llmFailureCount = 0;
      return false;
    }
    return true;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutRef: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef = setTimeout(() => reject(new Error('LLM_TIMEOUT')), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutRef) clearTimeout(timeoutRef);
    }
  }

  private normalizeExplainableOutput(
    rawOutput: unknown,
    route: string,
    context: Record<string, unknown>,
  ): ExplainableAiOutput {
    const objectOutput =
      rawOutput && typeof rawOutput === 'object' && !Array.isArray(rawOutput)
        ? (rawOutput as Record<string, unknown>)
        : this.buildFallbackOutput(route, context, 'Invalid LLM output format');

    const confidence = this.normalizeConfidence(objectOutput.confidence);
    const reasoning =
      typeof objectOutput.reasoning === 'string' && objectOutput.reasoning.trim().length > 0
        ? objectOutput.reasoning
        : 'Fallback reasoning: explainability fields were repaired due to invalid model output';
    const traced_to = this.normalizeTracedTo(objectOutput.traced_to, context);

    const normalized: ExplainableAiOutput = {
      action:
        typeof objectOutput.action === 'string' && objectOutput.action.trim().length > 0
          ? objectOutput.action
          : 'fallback_action',
      response:
        typeof objectOutput.response === 'string' && objectOutput.response.trim().length > 0
          ? objectOutput.response
          : 'Fallback response generated',
      confidence,
      reasoning,
      traced_to,
      route: route as ExplainableAiOutput['route'],
    };

    this.explainabilityRules.validate({
      confidence: normalized.confidence,
      reasoning: normalized.reasoning,
      traced_to: normalized.traced_to,
    });

    return normalized;
  }

  private normalizeConfidence(value: unknown): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0;
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  private normalizeTracedTo(value: unknown, context: Record<string, unknown>): string[] {
    if (Array.isArray(value) && value.length > 0) {
      return value.map((v) => String(v));
    }

    const derived = Object.keys(context ?? {});
    return derived.length > 0 ? derived : ['runtime_fallback'];
  }

  private buildFallbackOutput(
    route: string,
    context: Record<string, unknown>,
    reason: string,
  ): Record<string, unknown> {
    return {
      route,
      message: 'Fallback response generated',
      confidence: 0,
      reasoning: reason,
      traced_to:
        Object.keys(context ?? {}).length > 0 ? Object.keys(context) : ['runtime_fallback'],
    };
  }

  private isTestMode(): boolean {
    return process.env.AI_RUNTIME_TEST_MODE === 'true';
  }

  private extractToken(input: string, prefix: string): string | null {
    const part = input.split(' ').find((t) => t.startsWith(prefix));
    if (!part) return null;
    return part.replace(prefix, '').trim() || null;
  }
}
