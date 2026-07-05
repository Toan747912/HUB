import { MemoryAdapterService } from '../../../agent-core/infrastructure/memory-adapter.service';
import { PlannerAdapterService } from '../../../agent-core/infrastructure/planner-adapter.service';
import { ToolRegistryService } from '../../../agent-core/infrastructure/tool-registry.service';
import { VerificationPipelineService } from '../../../agent-core/infrastructure/verification-pipeline.service';
import { IAgentContext, IAgentResult } from '../../../agent-core/domain/interfaces';
import { ExecutionState } from '../../domain/execution-state';
import { RuntimeErrorCode, RuntimeExecutionError, RuntimeStepDefinition } from '../../domain/runtime.types';
import { RuntimeExecutor } from '../runtime-executor';

function buildContext(): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} };
}

function buildPartialResult(): IAgentResult {
  return { requestId: 'req-1', status: 'partial', output: {}, steps: [] };
}

describe('RuntimeExecutor', () => {
  let plannerAdapter: jest.Mocked<Pick<PlannerAdapterService, 'execute'>>;
  let toolRegistry: jest.Mocked<Pick<ToolRegistryService, 'get'>>;
  let memoryAdapter: jest.Mocked<Pick<MemoryAdapterService, 'read' | 'write'>>;
  let verificationPipeline: jest.Mocked<Pick<VerificationPipelineService, 'verify'>>;
  let executor: RuntimeExecutor;
  let state: ExecutionState;
  const context = buildContext();

  beforeEach(() => {
    plannerAdapter = { execute: jest.fn() };
    toolRegistry = { get: jest.fn() };
    memoryAdapter = { read: jest.fn(), write: jest.fn() };
    verificationPipeline = { verify: jest.fn() };

    executor = new RuntimeExecutor(
      plannerAdapter as unknown as PlannerAdapterService,
      toolRegistry as unknown as ToolRegistryService,
      memoryAdapter as unknown as MemoryAdapterService,
      verificationPipeline as unknown as VerificationPipelineService,
    );

    state = new ExecutionState(context.traceId);
  });

  describe('planner steps', () => {
    const step: RuntimeStepDefinition = {
      stepId: 'step-planner',
      name: 'Generate mission',
      kind: 'planner',
      target: 'mission_planner',
      input: { goalId: 'goal-1' },
    };

    it('completes the step with the planner response as output', async () => {
      plannerAdapter.execute.mockResolvedValue({
        confidence: 0.9,
        explanation: 'ok',
        provider: 'mock-llm',
        model: 'mock-llm-v1',
        fallbackUsed: false,
        promptVersion: 'v1',
      });

      await executor.executeStep(step, context, state, buildPartialResult());

      expect(plannerAdapter.execute).toHaveBeenCalledWith(
        'mission_planner',
        expect.objectContaining({ userId: 'user-1', traceId: 'trace-1', goalId: 'goal-1' }),
      );
      expect(state.completedSteps).toContain('step-planner');
      expect(state.stepOutputs.get('step-planner')).toMatchObject({ confidence: 0.9 });
    });

    it('throws PLANNER_FAILURE and records the failure when the planner rejects', async () => {
      plannerAdapter.execute.mockRejectedValue(new Error('llm down'));

      await expect(executor.executeStep(step, context, state, buildPartialResult())).rejects.toMatchObject({
        code: RuntimeErrorCode.PLANNER_FAILURE,
      });
      expect(state.failedSteps).toContain('step-planner');
      expect(state.stepErrors.get('step-planner')).toBe('llm down');
    });
  });

  describe('tool steps', () => {
    const step: RuntimeStepDefinition = {
      stepId: 'step-tool',
      name: 'Run tool',
      kind: 'tool',
      target: 'echo-tool',
      input: { message: 'hi' },
    };

    it('completes the step with the tool output', async () => {
      const tool = { name: 'echo-tool', description: '', execute: jest.fn().mockResolvedValue({ echoed: 'hi' }) };
      toolRegistry.get.mockReturnValue(tool);

      await executor.executeStep(step, context, state, buildPartialResult());

      expect(tool.execute).toHaveBeenCalledWith({ message: 'hi' }, context);
      expect(state.stepOutputs.get('step-tool')).toEqual({ echoed: 'hi' });
    });

    it('throws TOOL_FAILURE when the tool is not registered', async () => {
      toolRegistry.get.mockReturnValue(undefined);

      await expect(executor.executeStep(step, context, state, buildPartialResult())).rejects.toMatchObject({
        code: RuntimeErrorCode.TOOL_FAILURE,
      });
      expect(state.failedSteps).toContain('step-tool');
    });

    it('throws TOOL_FAILURE when the tool execution rejects', async () => {
      const tool = { name: 'echo-tool', description: '', execute: jest.fn().mockRejectedValue(new Error('tool broke')) };
      toolRegistry.get.mockReturnValue(tool);

      await expect(executor.executeStep(step, context, state, buildPartialResult())).rejects.toMatchObject({
        code: RuntimeErrorCode.TOOL_FAILURE,
      });
    });
  });

  describe('memory steps', () => {
    it('reads from memory by default', async () => {
      const step: RuntimeStepDefinition = {
        stepId: 'step-memory-read',
        name: 'Read memory',
        kind: 'memory',
        target: 'last-mission',
      };
      memoryAdapter.read.mockResolvedValue({ missionId: 'mission-1' });

      await executor.executeStep(step, context, state, buildPartialResult());

      expect(memoryAdapter.read).toHaveBeenCalledWith('last-mission', context);
      expect(state.stepOutputs.get('step-memory-read')).toEqual({ value: { missionId: 'mission-1' } });
    });

    it('writes to memory when input.operation is write', async () => {
      const step: RuntimeStepDefinition = {
        stepId: 'step-memory-write',
        name: 'Write memory',
        kind: 'memory',
        target: 'last-mission',
        input: { operation: 'write', value: { missionId: 'mission-2' } },
      };

      await executor.executeStep(step, context, state, buildPartialResult());

      expect(memoryAdapter.write).toHaveBeenCalledWith('last-mission', { missionId: 'mission-2' }, context);
      expect(state.stepOutputs.get('step-memory-write')).toEqual({ written: true });
    });

    it('throws MEMORY_FAILURE when the memory adapter rejects', async () => {
      const step: RuntimeStepDefinition = {
        stepId: 'step-memory-read',
        name: 'Read memory',
        kind: 'memory',
        target: 'last-mission',
      };
      memoryAdapter.read.mockRejectedValue(new Error('store unavailable'));

      await expect(executor.executeStep(step, context, state, buildPartialResult())).rejects.toMatchObject({
        code: RuntimeErrorCode.MEMORY_FAILURE,
      });
    });
  });

  describe('verification steps', () => {
    const step: RuntimeStepDefinition = {
      stepId: 'step-verify',
      name: 'Verify result',
      kind: 'verification',
      target: 'default',
    };

    it('completes when the pipeline accepts the result', async () => {
      verificationPipeline.verify.mockResolvedValue(true);

      await executor.executeStep(step, context, state, buildPartialResult());

      expect(state.stepOutputs.get('step-verify')).toEqual({ verified: true });
    });

    it('throws INVALID_RESULT when the pipeline rejects the result', async () => {
      verificationPipeline.verify.mockResolvedValue(false);

      await expect(executor.executeStep(step, context, state, buildPartialResult())).rejects.toBeInstanceOf(
        RuntimeExecutionError,
      );
      await expect(
        executor.executeStep(step, context, new ExecutionState('trace-2'), buildPartialResult()),
      ).rejects.toMatchObject({ code: RuntimeErrorCode.INVALID_RESULT });
    });
  });
});
