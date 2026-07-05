import { Injectable, Optional } from '@nestjs/common';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { IAgentRequest, IAgentResult, IAgentStep } from '../../agent-core/domain/interfaces';
import { AgentResultStatus, AgentStepStatus } from '../../agent-core/domain/types/agent-core.types';
import { LifecycleService } from '../../agent-lifecycle/application/lifecycle.service';
import { ExecutionState } from '../domain/execution-state';
import {
  RuntimeErrorCode,
  RuntimeExecutionError,
  RuntimeStepDefinition,
  RuntimeWorkflowDefinition,
} from '../domain/runtime.types';
import { AgentRegistryService } from './agent-registry.service';
import { RuntimeContextFactory } from './runtime-context.factory';
import { RuntimeExecutor } from './runtime-executor';
import { WorkflowRegistryService } from './workflow-registry.service';

/**
 * Top-level Agent Runtime: loads the agent from the Agent Registry, resolves
 * its workflow, and executes the workflow's steps sequentially through
 * RuntimeExecutor - stopping on the first unrecoverable failure. No planner,
 * tool, or memory logic lives here; this only sequences and reports.
 */
@Injectable()
export class AgentRuntimeService {
  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly workflowRegistry: WorkflowRegistryService,
    private readonly contextFactory: RuntimeContextFactory,
    private readonly executor: RuntimeExecutor,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly metrics?: MetricsService,
    @Optional() private readonly lifecycleService?: LifecycleService,
  ) {}

  async run(request: IAgentRequest): Promise<IAgentResult> {
    const context = this.contextFactory.build(request);
    const state = new ExecutionState(context.traceId);

    const agentDefinition = this.agentRegistry.get(request.agentId);
    if (!agentDefinition) {
      state.finish();
      return this.finalize(
        request,
        [],
        state,
        'failure',
        `${RuntimeErrorCode.AGENT_NOT_FOUND}: ${request.agentId}`,
      );
    }

    const workflow = this.workflowRegistry.get(agentDefinition.workflowId);
    if (!workflow) {
      state.finish();
      return this.finalize(
        request,
        [],
        state,
        'failure',
        `${RuntimeErrorCode.WORKFLOW_NOT_FOUND}: ${agentDefinition.workflowId}`,
      );
    }

    let instanceId: string | undefined;
    if (this.lifecycleService) {
      const instance = await this.lifecycleService.createInstance({
        agentId: agentDefinition.id,
        workflowId: workflow.workflowId,
        traceId: context.traceId,
        userId: context.userId,
        sessionId: context.sessionId ?? null,
      });
      await this.lifecycleService.markReady(instance.instanceId);
      await this.lifecycleService.start(instance.instanceId);
      instanceId = instance.instanceId;
      state.instanceId = instanceId;
    }

    for (const step of workflow.steps) {
      const partialResult = this.buildResult(request, workflow, state, 'partial');
      try {
        await this.executor.executeStep(step, context, state, partialResult);
      } catch (error) {
        state.finish();
        const message = error instanceof RuntimeExecutionError ? error.message : String(error);
        this.logRunOutcome(request.agentId, 'FAILURE', state.durationMs);
        if (instanceId) {
          await this.lifecycleService?.fail(instanceId, message).catch(() => undefined);
        }
        return this.finalize(request, workflow.steps, state, 'failure', message);
      }
    }

    state.finish();
    this.logRunOutcome(request.agentId, 'SUCCESS', state.durationMs);
    if (instanceId) {
      await this.lifecycleService?.complete(instanceId).catch(() => undefined);
    }
    return this.finalize(request, workflow.steps, state, 'success');
  }

  private buildResult(
    request: IAgentRequest,
    workflow: RuntimeWorkflowDefinition,
    state: ExecutionState,
    status: AgentResultStatus,
  ): IAgentResult {
    return {
      requestId: request.requestId,
      status,
      output: this.mergeOutputs(state),
      steps: this.buildSteps(workflow.steps, state),
    };
  }

  private finalize(
    request: IAgentRequest,
    steps: RuntimeStepDefinition[],
    state: ExecutionState,
    status: AgentResultStatus,
    error?: string,
  ): IAgentResult {
    return {
      requestId: request.requestId,
      status,
      output: this.mergeOutputs(state),
      steps: this.buildSteps(steps, state),
      ...(error ? { error } : {}),
    };
  }

  private mergeOutputs(state: ExecutionState): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const [stepId, output] of state.stepOutputs.entries()) {
      merged[stepId] = output;
    }
    return merged;
  }

  private buildSteps(definitions: RuntimeStepDefinition[], state: ExecutionState): IAgentStep[] {
    return definitions.map((definition) => {
      const isCompleted = state.completedSteps.includes(definition.stepId);
      const isFailed = state.failedSteps.includes(definition.stepId);
      const status: AgentStepStatus = isCompleted ? 'completed' : isFailed ? 'failed' : 'skipped';

      return {
        stepId: definition.stepId,
        name: definition.name,
        status,
        input: definition.input,
        output: state.stepOutputs.get(definition.stepId),
        error: state.stepErrors.get(definition.stepId),
      };
    });
  }

  private logRunOutcome(agentId: string, status: 'SUCCESS' | 'FAILURE', latencyMs: number): void {
    this.structuredLogger?.log({
      operation: 'AGENT_RUNTIME_RUN',
      status,
      latencyMs,
      aggregateId: agentId,
    });
    this.metrics?.recordPlannerOutcome?.({
      capability: `agent_runtime_${agentId}`,
      status,
      latencyMs,
      fallbackUsed: false,
      timedOut: false,
    });
  }
}
