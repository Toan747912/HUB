import { IAgentContext } from '../../../agent-core/domain/interfaces';
import { AgentRegistryService } from '../../../agent-runtime/application/agent-registry.service';
import { PlannedAgent } from '../../domain/coordination-plan';
import { CoordinationErrorCode, CoordinationExecutionError } from '../../domain/coordination.types';
import { AgentSelectionService } from '../agent-selection.service';

function context(): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} };
}

describe('AgentSelectionService', () => {
  let registry: AgentRegistryService;
  let service: AgentSelectionService;

  beforeEach(() => {
    registry = new AgentRegistryService();
    service = new AgentSelectionService(registry);
  });

  it('throws AGENT_NOT_FOUND when the agent is not registered in the Agent Registry', () => {
    const agent: PlannedAgent = { agentId: 'ghost', goal: 'do work', role: 'mandatory' };

    expect(() => service.resolve(agent)).toThrow(CoordinationExecutionError);
    try {
      service.resolve(agent);
      fail('expected resolve to throw');
    } catch (error) {
      expect((error as CoordinationExecutionError).code).toBe(CoordinationErrorCode.AGENT_NOT_FOUND);
    }
  });

  it('builds an IAgentRequest carrying the planned agent goal, input, and shared context', () => {
    registry.register({ id: 'agent-1', name: 'Agent One', workflowId: 'workflow-1' });
    const agent: PlannedAgent = {
      agentId: 'agent-1',
      goal: 'summarize evidence',
      input: { topic: 'fractions' },
      role: 'mandatory',
    };

    const request = service.buildRequest(agent, context());

    expect(request.agentId).toBe('agent-1');
    expect(request.goal).toBe('summarize evidence');
    expect(request.input).toEqual({ topic: 'fractions' });
    expect(request.context).toEqual(context());
    expect(request.requestId).toEqual(expect.any(String));
  });

  it('defaults input to an empty object when the planned agent has none', () => {
    registry.register({ id: 'agent-1', name: 'Agent One', workflowId: 'workflow-1' });
    const agent: PlannedAgent = { agentId: 'agent-1', goal: 'do work', role: 'optional' };

    const request = service.buildRequest(agent, context());

    expect(request.input).toEqual({});
  });
});
