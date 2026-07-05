import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { PlannerCapability } from '../../../domain/ai.types';
import { BasePlanRequest } from '../../../infrastructure/ai-brain/base-planner.service';
import { IAgentContext, IAgentResult } from '../../agent-core/domain/interfaces';
import { MemoryAdapterService } from '../../agent-core/infrastructure/memory-adapter.service';
import { PlannerAdapterService } from '../../agent-core/infrastructure/planner-adapter.service';
import { ToolRegistryService } from '../../agent-core/infrastructure/tool-registry.service';
import { VerificationPipelineService } from '../../agent-core/infrastructure/verification-pipeline.service';
import { LifecycleService } from '../../agent-lifecycle/application/lifecycle.service';
import { ExecutionState } from '../domain/execution-state';
import { RuntimeErrorCode, RuntimeExecutionError, RuntimeStepDefinition } from '../domain/runtime.types';

/**
 * Executes a single declarative workflow step by dispatching to the right
 * layer (PlannerAdapter/ToolRegistry/MemoryAdapter/VerificationPipeline),
 * recording the outcome on ExecutionState, and emitting structured logs +
 * metrics + an audit event for every step - success or failure.
 */
@Injectable()
export class RuntimeExecutor {
  constructor(
    private readonly plannerAdapter: PlannerAdapterService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly memoryAdapter: MemoryAdapterService,
    private readonly verificationPipeline: VerificationPipelineService,
    private readonly metrics?: MetricsService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly auditLog?: AuditLogService,
    private readonly lifecycleService?: LifecycleService,
  ) {}

  async executeStep(
    step: RuntimeStepDefinition,
    context: IAgentContext,
    state: ExecutionState,
    partialResult: IAgentResult,
  ): Promise<void> {
    state.startStep(step.stepId);
    if (state.instanceId) {
      await this.lifecycleService?.notifyStepStarted(state.instanceId, step.stepId).catch(() => undefined);
    }

    try {
      const output = await this.dispatch(step, context, partialResult);
      state.completeStep(step.stepId, output);
      await this.emitObservability(step, context, 'SUCCESS', state.stepDurationMs(step.stepId));
      if (state.instanceId) {
        await this.lifecycleService
          ?.notifyStepCompleted(state.instanceId, step.stepId)
          .catch(() => undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.failStep(step.stepId, message);
      await this.emitObservability(
        step,
        context,
        'FAILURE',
        state.stepDurationMs(step.stepId),
        message,
      );
      if (state.instanceId) {
        await this.lifecycleService
          ?.notifyStepFailed(state.instanceId, step.stepId, message)
          .catch(() => undefined);
      }

      if (error instanceof RuntimeExecutionError) throw error;
      throw new RuntimeExecutionError(this.errorCodeFor(step), message, step.stepId);
    }
  }

  private async dispatch(
    step: RuntimeStepDefinition,
    context: IAgentContext,
    partialResult: IAgentResult,
  ): Promise<Record<string, unknown>> {
    switch (step.kind) {
      case 'planner':
        return this.runPlannerStep(step, context);
      case 'tool':
        return this.runToolStep(step, context);
      case 'memory':
        return this.runMemoryStep(step, context);
      case 'verification':
        return this.runVerificationStep(step, context, partialResult);
      default:
        throw new RuntimeExecutionError(
          RuntimeErrorCode.INVALID_RESULT,
          `Unknown step kind: ${step.kind as string}`,
          step.stepId,
        );
    }
  }

  private async runPlannerStep(
    step: RuntimeStepDefinition,
    context: IAgentContext,
  ): Promise<Record<string, unknown>> {
    const request: BasePlanRequest = {
      userId: context.userId,
      traceId: context.traceId,
      sessionId: context.sessionId ?? '',
      goalId: '',
      ...(step.input ?? {}),
    } as BasePlanRequest;

    try {
      const response = await this.plannerAdapter.execute(step.target as PlannerCapability, request);
      return response as unknown as Record<string, unknown>;
    } catch (error) {
      throw new RuntimeExecutionError(
        RuntimeErrorCode.PLANNER_FAILURE,
        error instanceof Error ? error.message : String(error),
        step.stepId,
      );
    }
  }

  private async runToolStep(
    step: RuntimeStepDefinition,
    context: IAgentContext,
  ): Promise<Record<string, unknown>> {
    const tool = this.toolRegistry.get(step.target);
    if (!tool) {
      throw new RuntimeExecutionError(
        RuntimeErrorCode.TOOL_FAILURE,
        `Tool not registered: ${step.target}`,
        step.stepId,
      );
    }

    try {
      return await tool.execute(step.input ?? {}, context);
    } catch (error) {
      throw new RuntimeExecutionError(
        RuntimeErrorCode.TOOL_FAILURE,
        error instanceof Error ? error.message : String(error),
        step.stepId,
      );
    }
  }

  private async runMemoryStep(
    step: RuntimeStepDefinition,
    context: IAgentContext,
  ): Promise<Record<string, unknown>> {
    try {
      const operation = (step.input?.operation as 'read' | 'write' | undefined) ?? 'read';

      if (operation === 'write') {
        await this.memoryAdapter.write(step.target, step.input?.value, context);
        return { written: true };
      }

      const value = await this.memoryAdapter.read(step.target, context);
      return { value };
    } catch (error) {
      throw new RuntimeExecutionError(
        RuntimeErrorCode.MEMORY_FAILURE,
        error instanceof Error ? error.message : String(error),
        step.stepId,
      );
    }
  }

  private async runVerificationStep(
    step: RuntimeStepDefinition,
    context: IAgentContext,
    partialResult: IAgentResult,
  ): Promise<Record<string, unknown>> {
    const passed = await this.verificationPipeline.verify(partialResult, context);
    if (!passed) {
      throw new RuntimeExecutionError(
        RuntimeErrorCode.INVALID_RESULT,
        'Verification pipeline rejected the result',
        step.stepId,
      );
    }
    return { verified: true };
  }

  private errorCodeFor(step: RuntimeStepDefinition): RuntimeErrorCode {
    switch (step.kind) {
      case 'planner':
        return RuntimeErrorCode.PLANNER_FAILURE;
      case 'tool':
        return RuntimeErrorCode.TOOL_FAILURE;
      case 'memory':
        return RuntimeErrorCode.MEMORY_FAILURE;
      case 'verification':
        return RuntimeErrorCode.INVALID_RESULT;
      default:
        return RuntimeErrorCode.INVALID_RESULT;
    }
  }

  private async emitObservability(
    step: RuntimeStepDefinition,
    context: IAgentContext,
    status: 'SUCCESS' | 'FAILURE',
    latencyMs: number,
    errorCode?: string,
  ): Promise<void> {
    this.structuredLogger?.log({
      operation: `AGENT_STEP_${step.kind.toUpperCase()}`,
      status,
      latencyMs,
      aggregateId: step.stepId,
      errorCode,
    });

    this.metrics?.recordPlannerOutcome?.({
      capability: `agent_step_${step.kind}_${step.target}`,
      status,
      latencyMs,
      fallbackUsed: false,
      timedOut: false,
    });

    await this.auditLog
      ?.recordSecurityEvent({
        traceId: context.traceId,
        userId: context.userId ?? null,
        operation: `AGENT_STEP_${status}`,
        resource: `RuntimeStep:${step.stepId}`,
        after: { kind: step.kind, target: step.target, status, latencyMs },
      })
      .catch(() => undefined);
  }
}
