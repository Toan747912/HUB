import { IAgentContext } from '../../../agent-core/domain/interfaces';
import { AgentExecutionOutcome } from '../../domain/coordination-result';
import { CoordinationPlan, PlannedAgent } from '../../domain/coordination-plan';
import { CoordinationErrorCode, CoordinationExecutionError } from '../../domain/coordination.types';
import { CoordinatorPolicyService } from '../coordinator-policy.service';

function context(): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} };
}

function agent(agentId: string, overrides: Partial<PlannedAgent> = {}): PlannedAgent {
  return { agentId, goal: 'do work', role: 'mandatory', ...overrides };
}

function plan(agents: PlannedAgent[]): CoordinationPlan {
  return {
    planId: 'plan-1',
    agents,
    executionOrder: [{ mode: agents.length > 1 ? 'parallel-planned' : 'single', agents }],
    sharedMemoryScopes: [],
    executionPolicy: 'Sequential',
    dependencies: {},
    expectedOutputs: [],
  };
}

describe('CoordinatorPolicyService', () => {
  let service: CoordinatorPolicyService;

  beforeEach(() => {
    service = new CoordinatorPolicyService();
  });

  it('exposes a strategy contract for every named execution policy', () => {
    for (const name of ['Sequential', 'Parallel', 'FirstSuccess', 'MajorityVote', 'Pipeline'] as const) {
      expect(service.get(name).name).toBe(name);
    }
  });

  it('Sequential runs agents in group order and stops after a mandatory failure', async () => {
    const a = agent('agent-a');
    const b = agent('agent-b', { role: 'mandatory' });
    const invoked: string[] = [];

    const invoke = jest.fn(async (plannedAgent: PlannedAgent): Promise<AgentExecutionOutcome> => {
      invoked.push(plannedAgent.agentId);
      return { agentId: plannedAgent.agentId, role: plannedAgent.role, status: 'failed', error: 'boom' };
    });

    const outcomes = await service.get('Sequential').run(plan([a, b]), context(), invoke);

    expect(invoked).toEqual(['agent-a']);
    expect(outcomes.map((o) => o.status)).toEqual(['failed', 'skipped']);
  });

  for (const name of ['Parallel', 'FirstSuccess', 'MajorityVote', 'Pipeline'] as const) {
    it(`${name} rejects with STRATEGY_NOT_IMPLEMENTED`, async () => {
      const invoke = jest.fn();
      await expect(service.get(name).run(plan([agent('agent-a')]), context(), invoke)).rejects.toMatchObject({
        code: CoordinationErrorCode.STRATEGY_NOT_IMPLEMENTED,
      });
      expect(invoke).not.toHaveBeenCalled();
    });
  }

  it('throws STRATEGY_NOT_IMPLEMENTED for an unregistered policy name', () => {
    expect(() => service.get('Unknown' as never)).toThrow(CoordinationExecutionError);
  });
});
