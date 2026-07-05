import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { BasePlanRequest, BasePlanResponse } from '../../../infrastructure/ai-brain/base-planner.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { PlannerCapability } from '../../../domain/ai.types';
import { DiscoveryPlannerService } from '../../discovery-planner/application/services/discovery-planner.service';
import { DiscoveryPlanRequest } from '../../discovery-planner/application/contracts/discovery-planner.contracts';
import { EvidencePlannerService } from '../../evidence-planner/application/services/evidence-planner.service';
import { EvidencePlanRequest } from '../../evidence-planner/application/contracts/evidence-planner.contracts';
import { KnowledgePlannerService } from '../../knowledge-planner/application/services/knowledge-planner.service';
import { KnowledgePlanRequest } from '../../knowledge-planner/application/contracts/knowledge-planner.contracts';
import { MissionPlannerService } from '../../mission-planner/application/services/mission-planner.service';
import { MissionPlanRequest } from '../../mission-planner/application/contracts/mission-planner.contracts';
import { TeachingPlannerService } from '../../teaching-planner/application/services/teaching-planner.service';
import { TeachingPlanRequest } from '../../teaching-planner/application/contracts/teaching-planner.contracts';

/**
 * Single sanctioned entry point into the AI Brain planners. The agent runtime
 * must never call a planner service directly - it always goes through here,
 * so planner selection stays declarative (by capability name) and planner
 * internals stay untouched.
 *
 * Every dispatch emits a structured log, a metric, and an audit event
 * (adapter-level, in addition to whatever the planner itself already emits
 * internally via BasePlannerService), mirroring the observability shape
 * CoordinatorService/ToolRegistryService (agent-tools) use.
 */
@Injectable()
export class PlannerAdapterService {
  constructor(
    private readonly missionPlannerService: MissionPlannerService,
    private readonly discoveryPlannerService: DiscoveryPlannerService,
    private readonly knowledgePlannerService: KnowledgePlannerService,
    private readonly evidencePlannerService: EvidencePlannerService,
    private readonly teachingPlannerService: TeachingPlannerService,
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async execute(capability: PlannerCapability, request: BasePlanRequest): Promise<BasePlanResponse> {
    const startedAt = Date.now();
    try {
      const response = await this.dispatch(capability, request);
      this.emitOutcome(capability, request, Date.now() - startedAt, 'SUCCESS', response.confidence);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emitOutcome(capability, request, Date.now() - startedAt, 'FAILURE', undefined, message);
      throw error;
    }
  }

  private async dispatch(capability: PlannerCapability, request: BasePlanRequest): Promise<BasePlanResponse> {
    switch (capability) {
      case 'mission_planner':
        return this.missionPlannerService.generateTodaysMission(request as MissionPlanRequest);
      case 'discovery_planner':
        return this.discoveryPlannerService.discoverInitialFocus(request as DiscoveryPlanRequest);
      case 'knowledge_planner':
        return this.knowledgePlannerService.recommendKnowledge(request as KnowledgePlanRequest);
      case 'evidence_planner':
        return this.evidencePlannerService.planEvidence(request as EvidencePlanRequest);
      case 'teaching_planner':
        return this.teachingPlannerService.planTeaching(request as TeachingPlanRequest);
      default:
        throw new Error(`Unknown planner capability: ${capability as string}`);
    }
  }

  private emitOutcome(
    capability: PlannerCapability,
    request: BasePlanRequest,
    latencyMs: number,
    status: 'SUCCESS' | 'FAILURE',
    confidence?: number,
    errorMessage?: string,
  ): void {
    this.structuredLogger?.log({
      operation: 'AGENT_CORE_PLANNER_ADAPTER_DISPATCH',
      status,
      latencyMs,
      aggregateId: `${capability}:${request.goalId}`,
      errorCode: errorMessage,
    });

    this.metrics?.recordPlannerOutcome?.({
      capability: `agent_core_planner_adapter_${capability}`,
      status,
      latencyMs,
      confidence,
      fallbackUsed: false,
      timedOut: false,
    });

    this.auditLog
      ?.recordSecurityEvent({
        traceId: request.traceId,
        userId: request.userId,
        operation: `AGENT_CORE_PLANNER_ADAPTER_${status}`,
        resource: `PlannerCapability:${capability}`,
        after: errorMessage ? { error: errorMessage } : { confidence },
      })
      .catch(() => undefined);
  }
}
