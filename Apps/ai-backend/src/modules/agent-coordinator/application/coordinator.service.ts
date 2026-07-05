import { Injectable, Optional } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { IAgentContext, IAgentRequest, IAgentResult } from '../../agent-core/domain/interfaces';
import { CompletedExecutionInput } from '../../agent-learning/domain/experience';
import { LearningService } from '../../agent-learning/application/learning.service';
import { LifecycleService } from '../../agent-lifecycle/application/lifecycle.service';
import { MemoryStoreService } from '../../agent-memory/application/memory-store.service';
import { MemoryScope } from '../../agent-memory/domain/memory-scope';
import { MessageBusService } from '../../agent-message-bus/application/message-bus.service';
import { AgentMessage } from '../../agent-message-bus/domain/agent-message';
import { MessageStatus } from '../../agent-message-bus/domain/message-status';
import { MessageType } from '../../agent-message-bus/domain/message-types';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { AgentExecutionOutcome, CoordinationResult } from '../domain/coordination-result';
import { CoordinationPlan, PlannedAgent } from '../domain/coordination-plan';
import { AggregationStrategy, CoordinationExecutionError } from '../domain/coordination.types';
import { ICoordinator } from '../interfaces/coordinator.interface';
import { AgentSelectionService } from './agent-selection.service';
import { CoordinatorPolicyService } from './coordinator-policy.service';
import { CoordinatorRegistryService } from './coordinator-registry.service';
import { CoordinationRequest } from './contracts/coordinator.contracts';
import { ExecutionPlanService } from './execution-plan.service';

/**
 * Top-level Multi-Agent Coordinator: resolves a coordination plan into an
 * ordered set of agent invocations and delegates each one to the Agent
 * Message Bus (never invoking AgentRuntimeService directly, and never
 * executing workflow steps itself), then aggregates the results. Mirrors
 * AgentRuntimeService.run(): internal helpers throw
 * CoordinationExecutionError, but this public entry point always resolves
 * with a status-tagged CoordinationResult, never rejects.
 */
@Injectable()
export class CoordinatorService implements ICoordinator {
  constructor(
    private readonly executionPlan: ExecutionPlanService,
    private readonly agentSelection: AgentSelectionService,
    private readonly messageBus: MessageBusService,
    private readonly sharedMemory?: MemoryStoreService,
    @Optional() private readonly lifecycleService?: LifecycleService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly metrics?: MetricsService,
    private readonly policy?: CoordinatorPolicyService,
    private readonly registry?: CoordinatorRegistryService,
    private readonly auditLog?: AuditLogService,
    @Optional() private readonly learningService?: LearningService,
  ) {}

  async coordinate(request: CoordinationRequest): Promise<CoordinationResult> {
    const startedAt = Date.now();

    let plan: CoordinationPlan;
    try {
      plan = this.executionPlan.buildPlan(request.plan);
    } catch (error) {
      return this.failPlan(request.plan.planId, error, Date.now() - startedAt, 0, request.context);
    }

    this.registry?.register(plan);
    this.emitLifecycleEvent('COORDINATION_STARTED', plan.planId, 'SUCCESS', request.context);

    const policyService = this.policy ?? new CoordinatorPolicyService();
    let outcomes: AgentExecutionOutcome[];
    try {
      outcomes = await policyService
        .get(plan.executionPolicy)
        .run(plan, request.context, async (agent, agentPlan, context) => {
          const agentStartedAt = Date.now();
          const outcome = await this.runAgent(agent, agentPlan, context);
          this.emitAgentOutcome(agent.agentId, outcome.status === 'completed' ? 'SUCCESS' : 'FAILURE', Date.now() - agentStartedAt);
          return outcome;
        });
    } catch (error) {
      return this.failPlan(plan.planId, error, Date.now() - startedAt, plan.agents.length, request.context);
    }

    const failedOutcome = outcomes.find(
      (outcome) => outcome.status === 'failed' && plan.agents.find((a) => a.agentId === outcome.agentId)?.role === 'mandatory',
    );

    const status = failedOutcome
      ? 'failure'
      : outcomes.some((outcome) => outcome.status === 'failed')
        ? 'partial'
        : 'success';

    const executionTime = Date.now() - startedAt;
    const aggregatedOutput = this.aggregate(outcomes, request.aggregation);
    const result: CoordinationResult = {
      planId: plan.planId,
      status,
      outcomes,
      aggregatedOutput,
      participatingAgents: plan.agents.map((agent) => agent.agentId),
      completedAgents: outcomes.filter((o) => o.status === 'completed').map((o) => o.agentId),
      failedAgents: outcomes.filter((o) => o.status === 'failed').map((o) => o.agentId),
      mergedOutput: aggregatedOutput,
      executionTime,
      ...(failedOutcome
        ? { error: failedOutcome.error ?? `Mandatory agent "${failedOutcome.agentId}" failed` }
        : {}),
    };

    this.emitLifecycleEvent(
      status === 'success' ? 'COORDINATION_COMPLETED' : 'COORDINATION_FAILED',
      plan.planId,
      status === 'success' ? 'SUCCESS' : 'FAILURE',
      request.context,
      result.error,
      executionTime,
    );
    this.metrics?.recordCoordinationOutcome({
      status,
      durationMs: executionTime,
      agentCount: plan.agents.length,
      reason: result.error,
    });

    this.triggerLearning(plan, result, startedAt);

    return result;
  }

  /**
   * Best-effort hand-off into the Adaptive Learning Engine. Learning is a
   * pure consumer of completed executions - a failure here must never fail
   * the coordination result already computed above.
   */
  private triggerLearning(plan: CoordinationPlan, result: CoordinationResult, startedAt: number): void {
    if (!this.learningService) return;

    const input: CompletedExecutionInput = {
      workflowId: plan.planId,
      goal: plan.agents[0]?.goal ?? plan.planId,
      sourceType: 'coordination',
      status: result.status,
      participants: result.participatingAgents,
      roles: Object.fromEntries(plan.agents.map((agent) => [agent.agentId, agent.role])),
      errors: result.error ? [result.error] : undefined,
      startedAt,
      endedAt: startedAt + result.executionTime,
      durationMs: result.executionTime,
    };

    void this.learningService.runCycle(input).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.structuredLogger?.log({
        operation: 'COORDINATION_LEARNING_TRIGGER_FAILED',
        status: 'FAILURE',
        latencyMs: 0,
        aggregateId: plan.planId,
        errorCode: message,
      });
    });
  }

  private async runAgent(
    agent: PlannedAgent,
    plan: CoordinationPlan,
    context: IAgentContext,
  ): Promise<AgentExecutionOutcome> {
    let request: IAgentRequest;
    try {
      request = await this.buildRequestWithSharedMemory(agent, plan, context);
    } catch (error) {
      return this.toFailedOutcome(agent, error);
    }

    let instanceId: string | undefined;
    if (this.lifecycleService) {
      try {
        const instance = await this.lifecycleService.createInstance({
          agentId: agent.agentId,
          workflowId: plan.planId,
          traceId: context.traceId,
          userId: context.userId,
          sessionId: context.sessionId ?? null,
        });
        await this.lifecycleService.markReady(instance.instanceId);
        await this.lifecycleService.start(instance.instanceId);
        instanceId = instance.instanceId;
      } catch (error) {
        this.logLifecycleWriteFailure(agent.agentId, 'CREATE_OR_START', error);
        instanceId = undefined;
      }
    }

    const message = await this.messageBus.publish({
      traceId: context.traceId,
      workflowId: plan.planId,
      senderAgentId: 'coordinator',
      receiverAgentId: agent.agentId,
      messageType: MessageType.REQUEST,
      payload: request as unknown as Record<string, unknown>,
    });
    const result = this.toAgentResult(message, request);

    if (instanceId) {
      if (result.status === 'success') {
        await this.lifecycleService
          ?.complete(instanceId)
          .catch((error) => this.logLifecycleWriteFailure(agent.agentId, 'COMPLETE', error));
      } else {
        await this.lifecycleService
          ?.fail(instanceId, result.error ?? `Agent "${agent.agentId}" did not complete successfully`)
          .catch((error) => this.logLifecycleWriteFailure(agent.agentId, 'FAIL', error));
      }
    }

    if (result.status !== 'success') {
      return { agentId: agent.agentId, role: agent.role, status: 'failed', result, error: result.error };
    }

    await this.persistToSharedMemory(agent, plan, context, result.output);
    return { agentId: agent.agentId, role: agent.role, status: 'completed', result };
  }

  /**
   * Builds the agent's request without ever threading a prior agent's
   * IAgentResult in directly. Instead, outputs of its declared dependencies
   * are read back out of the shared memory scope they were written to -
   * agents only ever exchange data through SESSION/WORKFLOW/GLOBAL memory.
   */
  private async buildRequestWithSharedMemory(
    agent: PlannedAgent,
    plan: CoordinationPlan,
    context: IAgentContext,
  ): Promise<IAgentRequest> {
    const baseRequest = this.agentSelection.buildRequest(agent, context);
    const scope = plan.sharedMemoryScopes[0];

    if (!this.sharedMemory || !scope || !agent.dependsOn?.length) {
      return baseRequest;
    }

    const dependencyOutputs: Record<string, unknown> = {};
    for (const dependencyId of agent.dependsOn) {
      const record = await this.sharedMemory.get(
        { scope, scopeId: plan.planId, key: dependencyId },
        { traceId: context.traceId, userId: context.userId },
      );
      if (record) {
        dependencyOutputs[dependencyId] = record.value;
      }
    }

    return { ...baseRequest, input: { ...baseRequest.input, dependencyOutputs } };
  }

  private async persistToSharedMemory(
    agent: PlannedAgent,
    plan: CoordinationPlan,
    context: IAgentContext,
    output: Record<string, unknown>,
  ): Promise<void> {
    const scope: MemoryScope | undefined = plan.sharedMemoryScopes[0];
    if (!this.sharedMemory || !scope) {
      return;
    }

    await this.sharedMemory.set(
      { scope, scopeId: plan.planId, key: agent.agentId, value: output },
      { traceId: context.traceId, userId: context.userId },
    );
  }

  /**
   * Translates the AgentMessage the bus returns back into an IAgentResult.
   * A DELIVERED message carries the real runtime outcome (success or
   * failure) in metadata.response; anything else (FAILED/DEAD_LETTER/
   * unknown receiver) means the message never reached AgentRuntimeService,
   * which this reports as a synthetic failure result.
   */
  private toAgentResult(message: AgentMessage, request: IAgentRequest): IAgentResult {
    const response = message.metadata?.response as IAgentResult | undefined;
    if (message.status === MessageStatus.DELIVERED && response) {
      return response;
    }

    return {
      requestId: request.requestId,
      status: 'failure',
      output: {},
      steps: [],
      error: message.lastError ?? `Message bus delivery to "${message.receiverAgentId}" did not complete`,
    };
  }

  private toFailedOutcome(agent: PlannedAgent, error: unknown): AgentExecutionOutcome {
    const message =
      error instanceof CoordinationExecutionError || error instanceof Error ? error.message : String(error);
    return { agentId: agent.agentId, role: agent.role, status: 'failed', error: message };
  }

  private failPlan(
    planId: string,
    error: unknown,
    executionTime: number,
    agentCount: number,
    context: IAgentContext,
  ): CoordinationResult {
    const message =
      error instanceof CoordinationExecutionError || error instanceof Error ? error.message : String(error);

    this.emitLifecycleEvent('COORDINATION_FAILED', planId, 'FAILURE', context, message, executionTime);
    this.metrics?.recordCoordinationOutcome({ status: 'failure', durationMs: executionTime, agentCount, reason: message });

    return {
      planId,
      status: 'failure',
      outcomes: [],
      aggregatedOutput: {},
      participatingAgents: [],
      completedAgents: [],
      failedAgents: [],
      mergedOutput: {},
      executionTime,
      error: message,
    };
  }

  private aggregate(
    outcomes: AgentExecutionOutcome[],
    strategy: AggregationStrategy,
  ): Record<string, unknown> {
    const completed = outcomes.filter((outcome) => outcome.status === 'completed' && outcome.result);

    switch (strategy) {
      case 'FIRST_SUCCESS':
        return completed[0]?.result?.output ?? {};
      case 'ALL_SUCCESS':
        return outcomes.length > 0 && outcomes.every((outcome) => outcome.status === 'completed')
          ? this.merge(completed)
          : {};
      case 'BEST_CONFIDENCE':
        return this.bestConfidence(completed);
      case 'MERGE':
      default:
        return this.merge(completed);
    }
  }

  private merge(completed: AgentExecutionOutcome[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const outcome of completed) {
      merged[outcome.agentId] = outcome.result?.output ?? {};
    }
    return merged;
  }

  private bestConfidence(completed: AgentExecutionOutcome[]): Record<string, unknown> {
    let best: AgentExecutionOutcome | undefined;
    let bestScore = -Infinity;

    for (const outcome of completed) {
      const confidence = outcome.result?.output?.confidence;
      const score = typeof confidence === 'number' ? confidence : 0;
      if (!best || score > bestScore) {
        best = outcome;
        bestScore = score;
      }
    }

    return best ? { [best.agentId]: best.result?.output ?? {} } : {};
  }

  /**
   * Lifecycle writes around an agent invocation are a best-effort audit
   * trail, not the source of truth for coordination results - a failure
   * here must never fail the agent's outcome. It must not be silent either,
   * so every swallowed failure is still logged.
   */
  private logLifecycleWriteFailure(agentId: string, stage: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.structuredLogger?.log({
      operation: `LIFECYCLE_WRITE_FAILED_${stage}`,
      status: 'FAILURE',
      latencyMs: 0,
      aggregateId: agentId,
      errorCode: message,
    });
  }

  private emitAgentOutcome(agentId: string, status: 'SUCCESS' | 'FAILURE', latencyMs: number): void {
    this.structuredLogger?.log({
      operation: 'AGENT_COORDINATOR_RUN',
      status,
      latencyMs,
      aggregateId: agentId,
    });
    this.metrics?.recordPlannerOutcome?.({
      capability: `agent_coordinator_${agentId}`,
      status,
      latencyMs,
      fallbackUsed: false,
      timedOut: false,
    });
  }

  /**
   * Emits the three coordination-lifecycle events the work package calls
   * for (COORDINATION_STARTED/COMPLETED/FAILED), through the same
   * StructuredLoggerService/AuditLogService every other module uses -
   * never a bespoke logging path.
   */
  private emitLifecycleEvent(
    operation: 'COORDINATION_STARTED' | 'COORDINATION_COMPLETED' | 'COORDINATION_FAILED',
    planId: string,
    status: 'SUCCESS' | 'FAILURE',
    context: IAgentContext,
    errorMessage?: string,
    latencyMs = 0,
  ): void {
    this.structuredLogger?.log({
      operation,
      status,
      latencyMs,
      aggregateId: planId,
      errorCode: errorMessage,
    });
    this.auditLog
      ?.recordSecurityEvent({
        traceId: context.traceId,
        userId: context.userId,
        operation,
        resource: `CoordinationPlan:${planId}`,
        after: errorMessage ? { error: errorMessage } : undefined,
      })
      .catch(() => undefined);
  }
}
