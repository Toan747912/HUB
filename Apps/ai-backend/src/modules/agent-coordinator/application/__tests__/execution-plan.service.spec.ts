import { MemoryScope } from '../../../agent-memory/domain/memory-scope';
import { CoordinationPlanInput, PlannedAgent } from '../../domain/coordination-plan';
import { CoordinationErrorCode, CoordinationExecutionError } from '../../domain/coordination.types';
import { ExecutionPlanService } from '../execution-plan.service';

function agent(agentId: string, overrides: Partial<PlannedAgent> = {}): PlannedAgent {
  return { agentId, goal: 'do work', role: 'mandatory', ...overrides };
}

describe('ExecutionPlanService', () => {
  let service: ExecutionPlanService;

  beforeEach(() => {
    service = new ExecutionPlanService();
  });

  it('builds a single-mode plan for one agent with no dependencies', () => {
    const input: CoordinationPlanInput = {
      planId: 'plan-1',
      agents: [agent('agent-1')],
      sharedMemoryScopes: [MemoryScope.WORKFLOW],
    };

    const plan = service.buildPlan(input);

    expect(plan.executionOrder).toHaveLength(1);
    expect(plan.executionOrder[0].mode).toBe('single');
    expect(plan.executionOrder[0].agents.map((a) => a.agentId)).toEqual(['agent-1']);
  });

  it('orders agents sequentially according to their dependsOn chain', () => {
    const input: CoordinationPlanInput = {
      planId: 'plan-1',
      agents: [
        agent('agent-c', { dependsOn: ['agent-b'] }),
        agent('agent-a'),
        agent('agent-b', { dependsOn: ['agent-a'] }),
      ],
      sharedMemoryScopes: [MemoryScope.WORKFLOW],
    };

    const plan = service.buildPlan(input);

    expect(plan.executionOrder.map((group) => group.agents.map((a) => a.agentId))).toEqual([
      ['agent-a'],
      ['agent-b'],
      ['agent-c'],
    ]);
  });

  it('groups independent agents into a single parallel-planned group', () => {
    const input: CoordinationPlanInput = {
      planId: 'plan-1',
      agents: [agent('agent-a'), agent('agent-b'), agent('agent-c', { dependsOn: ['agent-a', 'agent-b'] })],
      sharedMemoryScopes: [MemoryScope.WORKFLOW],
    };

    const plan = service.buildPlan(input);

    expect(plan.executionOrder).toHaveLength(2);
    expect(plan.executionOrder[0].mode).toBe('parallel-planned');
    expect(plan.executionOrder[0].agents.map((a) => a.agentId).sort()).toEqual(['agent-a', 'agent-b']);
    expect(plan.executionOrder[1].agents.map((a) => a.agentId)).toEqual(['agent-c']);
  });

  it('throws UNKNOWN_DEPENDENCY when an agent depends on an unregistered agent id', () => {
    const input: CoordinationPlanInput = {
      planId: 'plan-1',
      agents: [agent('agent-a', { dependsOn: ['ghost'] })],
      sharedMemoryScopes: [MemoryScope.WORKFLOW],
    };

    expect(() => service.buildPlan(input)).toThrow(CoordinationExecutionError);
    try {
      service.buildPlan(input);
      fail('expected buildPlan to throw');
    } catch (error) {
      expect((error as CoordinationExecutionError).code).toBe(CoordinationErrorCode.UNKNOWN_DEPENDENCY);
    }
  });

  it('throws CYCLIC_DEPENDENCY when agents depend on each other in a cycle', () => {
    const input: CoordinationPlanInput = {
      planId: 'plan-1',
      agents: [agent('agent-a', { dependsOn: ['agent-b'] }), agent('agent-b', { dependsOn: ['agent-a'] })],
      sharedMemoryScopes: [MemoryScope.WORKFLOW],
    };

    try {
      service.buildPlan(input);
      fail('expected buildPlan to throw');
    } catch (error) {
      expect((error as CoordinationExecutionError).code).toBe(CoordinationErrorCode.CYCLIC_DEPENDENCY);
    }
  });

  it('throws INVALID_MEMORY_SCOPE when a disallowed scope is requested for sharing', () => {
    const input: CoordinationPlanInput = {
      planId: 'plan-1',
      agents: [agent('agent-a')],
      sharedMemoryScopes: [MemoryScope.AGENT],
    };

    try {
      service.buildPlan(input);
      fail('expected buildPlan to throw');
    } catch (error) {
      expect((error as CoordinationExecutionError).code).toBe(CoordinationErrorCode.INVALID_MEMORY_SCOPE);
    }
  });
});
