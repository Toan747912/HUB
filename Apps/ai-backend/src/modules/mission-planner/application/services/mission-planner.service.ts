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
  MISSION_FALLBACK_VERSION,
  MissionPlanningEngine,
} from '../../domain/engine/mission-planning.engine';
import { MissionTask } from '../../domain/engine/mission-planning.types';
import { buildMissionPrompt, MISSION_PROMPT_VERSION } from '../prompts/mission-prompt';
import { MissionPlanRequest, MissionPlanResponse } from '../contracts/mission-planner.contracts';

const VALID_TASK_SOURCES = ['roadmap', 'recommendation', 'review'];

/**
 * Mission Planner capability. Reads context only through ContextAssemblyService,
 * reaches the LLM only through ResilientLlmGateway, and always has a
 * deterministic fallback (MissionPlanningEngine) so a mission is produced even
 * when the LLM path is unavailable or returns untrustworthy output.
 */
@Injectable()
export class MissionPlannerService extends BasePlannerService<MissionPlanRequest, MissionPlanResponse> {
  protected readonly capability = 'mission_planner';
  protected readonly operationName = 'GENERATE_MISSION';
  protected readonly promptVersion = MISSION_PROMPT_VERSION;

  private readonly fallbackEngine = new MissionPlanningEngine();

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

  async generateTodaysMission(request: MissionPlanRequest): Promise<MissionPlanResponse> {
    return this.execute(request);
  }

  protected buildPrompt(context: BrainContext): string {
    return buildMissionPrompt(context);
  }

  protected buildTracedTo(context: BrainContext): string[] {
    return [
      `goal:${context.goalId}`,
      `roadmap:${context.roadmap.nodeId}`,
      `session:${context.sessionId}`,
    ];
  }

  protected emitMetrics(response: MissionPlanResponse): void {
    this.metrics?.incrementMissionPlanGenerated();
    this.metrics?.recordMissionPlanConfidence(response.confidence);
    if (response.fallbackUsed) {
      this.metrics?.incrementMissionPlanFallbackUsed();
    }
  }

  protected buildAuditEvent(
    _request: MissionPlanRequest,
    response: MissionPlanResponse,
  ): AuditEventDescriptor {
    return {
      operation: 'MISSION_PLAN_GENERATED',
      resource: `Mission:${response.missionId}`,
      after: {
        fallbackUsed: response.fallbackUsed,
        provider: response.provider,
        model: response.model,
        promptVersion: response.promptVersion,
        confidence: response.confidence,
        taskCount: response.tasks.length,
      },
    };
  }

  protected buildResponse(context: BrainContext, gatewayResult: LlmGatewayResult): MissionPlanResponse {
    return gatewayResult.fallbackUsed
      ? this.buildFallbackResponse(context, gatewayResult)
      : this.buildLlmResponse(context, gatewayResult);
  }

  private buildFallbackResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): MissionPlanResponse {
    const plan = this.fallbackEngine.generate(context);
    return {
      ...plan,
      confidence: 0.5,
      explanation: `Deterministic fallback (${MISSION_FALLBACK_VERSION}) used because: ${gatewayResult.fallbackReason ?? 'unknown'}.`,
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: true,
      promptVersion: MISSION_PROMPT_VERSION,
    };
  }

  private buildLlmResponse(
    context: BrainContext,
    gatewayResult: LlmGatewayResult,
  ): MissionPlanResponse {
    const raw = (gatewayResult.raw ?? {}) as Record<string, unknown>;
    const tasks = this.normalizeTasks(raw.tasks, context);

    if (!tasks) {
      return this.buildFallbackResponse(context, {
        ...gatewayResult,
        fallbackUsed: true,
        fallbackReason: 'invalid_llm_output',
      });
    }

    return {
      missionId: `mission-${context.goalId}-${context.assembledAt}`,
      goalId: context.goalId,
      sessionId: context.sessionId,
      date: context.assembledAt.slice(0, 10),
      tasks,
      focusSummary:
        typeof raw.focusSummary === 'string' && raw.focusSummary.trim().length > 0
          ? raw.focusSummary
          : 'Mission generated by LLM',
      confidence: this.normalizeConfidence(raw.confidence),
      explanation:
        typeof raw.reasoning === 'string' && raw.reasoning.trim().length > 0
          ? raw.reasoning
          : 'No reasoning provided by model',
      provider: gatewayResult.provider,
      model: gatewayResult.model,
      fallbackUsed: false,
      promptVersion: MISSION_PROMPT_VERSION,
    };
  }

  private normalizeTasks(value: unknown, context: BrainContext): MissionTask[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;

    return value.map((raw, index) => {
      const t = (raw ?? {}) as Record<string, unknown>;
      return {
        id: typeof t.id === 'string' && t.id.trim().length > 0 ? t.id : `${context.goalId}-task-${index}`,
        title: typeof t.title === 'string' && t.title.trim().length > 0 ? t.title : 'Untitled task',
        description: typeof t.description === 'string' ? t.description : '',
        estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : 15,
        source: VALID_TASK_SOURCES.includes(t.source as string)
          ? (t.source as MissionTask['source'])
          : 'review',
      };
    });
  }
}
