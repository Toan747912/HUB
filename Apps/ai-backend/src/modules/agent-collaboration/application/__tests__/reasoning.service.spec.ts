import { IAgentContext } from '../../../agent-core/domain/interfaces';
import { CoordinatorService } from '../../../agent-coordinator/application/coordinator.service';
import { CoordinationResult } from '../../../agent-coordinator/domain/coordination-result';
import { MemoryStoreService } from '../../../agent-memory/application/memory-store.service';
import { ReasoningService } from '../reasoning.service';
import { RoleResolverService } from '../role-resolver.service';

function context(): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} };
}

function coordinationResult(overrides: Partial<CoordinationResult> = {}): CoordinationResult {
  return {
    planId: 'plan-1',
    status: 'success',
    outcomes: [
      {
        agentId: 'analyst-agent',
        role: 'mandatory',
        status: 'completed',
        result: { requestId: 'req-1', status: 'success', output: { confidence: 0.9 }, steps: [] },
      },
    ],
    aggregatedOutput: {},
    participatingAgents: ['analyst-agent'],
    completedAgents: ['analyst-agent'],
    failedAgents: [],
    mergedOutput: {},
    executionTime: 5,
    ...overrides,
  };
}

describe('ReasoningService', () => {
  let roleResolver: RoleResolverService;
  let coordinator: jest.Mocked<Pick<CoordinatorService, 'coordinate'>>;
  let memoryStore: jest.Mocked<Pick<MemoryStoreService, 'set'>>;
  let reasoning: ReasoningService;

  beforeEach(() => {
    roleResolver = new RoleResolverService();
    roleResolver.registerRole('Analyst', 'analyst-agent');

    coordinator = { coordinate: jest.fn() };
    memoryStore = { set: jest.fn().mockResolvedValue(undefined) };

    reasoning = new ReasoningService(
      roleResolver,
      coordinator as unknown as CoordinatorService,
      memoryStore as unknown as MemoryStoreService,
    );
  });

  it('resolves the role to an agentId and dispatches through the Coordinator as a single-agent plan', async () => {
    coordinator.coordinate.mockResolvedValue(coordinationResult());

    const { step } = await reasoning.runStep('session-1', 'Analyst', 'analyze', { topic: 'x' }, context());

    expect(step.agentId).toBe('analyst-agent');
    expect(step.status).toBe('completed');
    expect(step.confidence).toBe(0.9);

    const planArg = coordinator.coordinate.mock.calls[0][0];
    expect(planArg.plan.agents).toEqual([
      { agentId: 'analyst-agent', goal: 'analyze', input: { topic: 'x' }, role: 'mandatory' },
    ]);
  });

  it('defaults confidence to 0.5 when the agent output does not report one', async () => {
    coordinator.coordinate.mockResolvedValue(
      coordinationResult({
        outcomes: [
          {
            agentId: 'analyst-agent',
            role: 'mandatory',
            status: 'completed',
            result: { requestId: 'req-1', status: 'success', output: {}, steps: [] },
          },
        ],
      }),
    );

    const { step } = await reasoning.runStep('session-1', 'Analyst', 'analyze', {}, context());

    expect(step.confidence).toBe(0.5);
  });

  it('marks the step failed when the underlying coordination outcome failed', async () => {
    coordinator.coordinate.mockResolvedValue(
      coordinationResult({
        status: 'failure',
        outcomes: [{ agentId: 'analyst-agent', role: 'mandatory', status: 'failed', error: 'boom' }],
      }),
    );

    const { step } = await reasoning.runStep('session-1', 'Analyst', 'analyze', {}, context());

    expect(step.status).toBe('failed');
    expect(step.error).toBe('boom');
  });

  it('extracts and persists artifacts reported in the agent output, tagging each with its type and role', async () => {
    coordinator.coordinate.mockResolvedValue(
      coordinationResult({
        outcomes: [
          {
            agentId: 'analyst-agent',
            role: 'mandatory',
            status: 'completed',
            result: {
              requestId: 'req-1',
              status: 'success',
              output: {
                confidence: 0.7,
                artifacts: [{ type: 'research_notes', content: { note: 'insight' } }],
              },
              steps: [],
            },
          },
        ],
      }),
    );

    const { step, artifacts } = await reasoning.runStep('session-1', 'Analyst', 'analyze', {}, context());

    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].type).toBe('research_notes');
    expect(artifacts[0].producedBy).toBe('Analyst');
    expect(artifacts[0].agentId).toBe('analyst-agent');
    expect(step.artifactsProduced).toEqual([artifacts[0].artifactId]);

    const artifactSetCall = memoryStore.set.mock.calls.find((call) => (call[0].key as string).startsWith('artifact:'));
    expect(artifactSetCall).toBeDefined();
    expect(artifactSetCall?.[0].tags).toEqual(['research_notes', 'Analyst']);
  });
});
