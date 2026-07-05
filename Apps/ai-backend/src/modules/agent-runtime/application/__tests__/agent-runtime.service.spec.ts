import { RuntimeExecutionError, RuntimeErrorCode, RuntimeStepDefinition } from '../../domain/runtime.types';
import { AgentRegistryService } from '../agent-registry.service';
import { AgentRuntimeService } from '../agent-runtime.service';
import { RuntimeContextFactory } from '../runtime-context.factory';
import { RuntimeExecutor } from '../runtime-executor';
import { WorkflowRegistryService } from '../workflow-registry.service';
import { IAgentRequest } from '../../../agent-core/domain/interfaces';

function buildRequest(agentId: string): IAgentRequest {
  return {
    requestId: 'req-1',
    agentId,
    goal: 'test goal',
    input: {},
    context: { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} },
  };
}

describe('AgentRuntimeService', () => {
  let agentRegistry: AgentRegistryService;
  let workflowRegistry: WorkflowRegistryService;
  let executor: jest.Mocked<Pick<RuntimeExecutor, 'executeStep'>>;
  let service: AgentRuntimeService;

  beforeEach(() => {
    agentRegistry = new AgentRegistryService();
    workflowRegistry = new WorkflowRegistryService();
    executor = { executeStep: jest.fn() };

    service = new AgentRuntimeService(
      agentRegistry,
      workflowRegistry,
      new RuntimeContextFactory(),
      executor as unknown as RuntimeExecutor,
    );
  });

  it('returns AGENT_NOT_FOUND failure when the agent id is unregistered', async () => {
    const result = await service.run(buildRequest('missing-agent'));

    expect(result.status).toBe('failure');
    expect(result.error).toContain(RuntimeErrorCode.AGENT_NOT_FOUND);
    expect(executor.executeStep).not.toHaveBeenCalled();
  });

  it('returns WORKFLOW_NOT_FOUND failure when the agent references an unregistered workflow', async () => {
    agentRegistry.register({ id: 'agent-1', name: 'Agent One', workflowId: 'missing-workflow' });

    const result = await service.run(buildRequest('agent-1'));

    expect(result.status).toBe('failure');
    expect(result.error).toContain(RuntimeErrorCode.WORKFLOW_NOT_FOUND);
  });

  it('executes workflow steps sequentially in order', async () => {
    agentRegistry.register({ id: 'agent-1', name: 'Agent One', workflowId: 'workflow-1' });
    const steps: RuntimeStepDefinition[] = [
      { stepId: 'step-a', name: 'A', kind: 'planner', target: 'mission_planner' },
      { stepId: 'step-b', name: 'B', kind: 'memory', target: 'last-mission' },
      { stepId: 'step-c', name: 'C', kind: 'verification', target: 'default' },
    ];
    workflowRegistry.register({ workflowId: 'workflow-1', name: 'Workflow One', steps });

    const executionOrder: string[] = [];
    executor.executeStep.mockImplementation(async (step, _context, state) => {
      executionOrder.push(step.stepId);
      state.completeStep(step.stepId, { ok: true });
    });

    const result = await service.run(buildRequest('agent-1'));

    expect(executionOrder).toEqual(['step-a', 'step-b', 'step-c']);
    expect(result.status).toBe('success');
    expect(result.steps.map((s) => s.status)).toEqual(['completed', 'completed', 'completed']);
  });

  it('stops execution on the first unrecoverable failure and marks remaining steps skipped', async () => {
    agentRegistry.register({ id: 'agent-1', name: 'Agent One', workflowId: 'workflow-1' });
    const steps: RuntimeStepDefinition[] = [
      { stepId: 'step-a', name: 'A', kind: 'planner', target: 'mission_planner' },
      { stepId: 'step-b', name: 'B', kind: 'tool', target: 'broken-tool' },
      { stepId: 'step-c', name: 'C', kind: 'verification', target: 'default' },
    ];
    workflowRegistry.register({ workflowId: 'workflow-1', name: 'Workflow One', steps });

    executor.executeStep.mockImplementation(async (step, _context, state) => {
      if (step.stepId === 'step-a') {
        state.completeStep(step.stepId, { ok: true });
        return;
      }
      state.failStep(step.stepId, 'tool exploded');
      throw new RuntimeExecutionError(RuntimeErrorCode.TOOL_FAILURE, 'tool exploded', step.stepId);
    });

    const result = await service.run(buildRequest('agent-1'));

    expect(result.status).toBe('failure');
    expect(result.error).toBe('tool exploded');
    expect(executor.executeStep).toHaveBeenCalledTimes(2);
    expect(result.steps.map((s) => s.status)).toEqual(['completed', 'failed', 'skipped']);
  });
});
