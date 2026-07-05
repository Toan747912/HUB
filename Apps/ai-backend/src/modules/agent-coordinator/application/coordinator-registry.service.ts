import { Inject, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import {
  COORDINATION_PLAN_REPOSITORY,
  CoordinationPlan,
  ICoordinationPlanRepository,
} from '../domain/coordination-plan';

const RECOVERY_LIMIT = 500;

/**
 * Stores resolved CoordinationPlans by planId, mirroring AgentRegistryService/
 * WorkflowRegistryService in agent-runtime. CoordinatorService registers a
 * plan once it resolves successfully, so callers can look up how a past or
 * in-flight coordination was planned without re-submitting it.
 *
 * Backed by MongoCoordinationPlanRepository so the registry survives a
 * restart (recoverAll() repopulates the cache in onModuleInit, matching the
 * LifecycleRegistryService/MessageBusService recovery pattern) instead of
 * being purely in-memory. register()/get() stay synchronous for existing
 * callers: the cache is updated immediately, persistence happens in the
 * background and is best-effort - a crash in the narrow window between
 * register() and the write completing loses that one plan from recovery,
 * the same risk profile already accepted elsewhere in this module (see
 * AgentLayerProductionHardening.md).
 */
@Injectable()
export class CoordinatorRegistryService implements OnModuleInit {
  private readonly logger = new Logger(CoordinatorRegistryService.name);
  private readonly plans = new Map<string, CoordinationPlan>();

  constructor(
    @Optional()
    @Inject(COORDINATION_PLAN_REPOSITORY)
    private readonly repository?: ICoordinationPlanRepository,
    private readonly structuredLogger?: StructuredLoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const recovered = await this.recoverAll();
    if (recovered.length > 0) {
      this.logger.log(`Recovered ${recovered.length} coordination plan(s) after restart`);
    }
  }

  register(plan: CoordinationPlan): void {
    this.plans.set(plan.planId, plan);
    void this.repository?.create(plan).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.structuredLogger?.log({
        operation: 'COORDINATION_PLAN_PERSIST_FAILED',
        status: 'FAILURE',
        latencyMs: 0,
        aggregateId: plan.planId,
        errorCode: message,
      });
    });
  }

  get(planId: string): CoordinationPlan | undefined {
    return this.plans.get(planId);
  }

  async recoverAll(): Promise<CoordinationPlan[]> {
    if (!this.repository) return [];
    const recent = await this.repository.findRecent(RECOVERY_LIMIT);
    for (const plan of recent) {
      this.plans.set(plan.planId, plan);
    }
    return recent;
  }
}
