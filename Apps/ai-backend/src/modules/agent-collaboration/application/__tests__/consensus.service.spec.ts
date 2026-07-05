import { ReasoningStep } from '../../domain/reasoning-step';
import { ConsensusService } from '../consensus.service';

function step(overrides: Partial<ReasoningStep> = {}): ReasoningStep {
  return {
    stepId: 'step-1',
    role: 'Analyst',
    agentId: 'agent-1',
    input: {},
    output: { decision: 'approve' },
    confidence: 0.8,
    executionTime: 10,
    artifactsProduced: [],
    status: 'completed',
    ...overrides,
  };
}

describe('ConsensusService', () => {
  let consensus: ConsensusService;

  beforeEach(() => {
    consensus = new ConsensusService();
  });

  it('resolves Majority when more than half of completed steps share the same output', () => {
    const steps = [
      step({ agentId: 'a1', output: { decision: 'approve' } }),
      step({ agentId: 'a2', output: { decision: 'approve' } }),
      step({ agentId: 'a3', output: { decision: 'reject' } }),
    ];

    const result = consensus.resolve('Majority', steps);

    expect(result.outcome).toBe('resolved');
    expect(result.decision).toEqual({ decision: 'approve' });
    expect(result.agreementScore).toBeCloseTo(2 / 3);
  });

  it('reports unresolved when there is no strict majority', () => {
    const steps = [
      step({ agentId: 'a1', output: { decision: 'approve' } }),
      step({ agentId: 'a2', output: { decision: 'reject' } }),
    ];

    const result = consensus.resolve('Majority', steps);

    expect(result.outcome).toBe('unresolved');
    expect(result.reason).toBeDefined();
  });

  it('reports unresolved when there are no completed steps', () => {
    const steps = [step({ status: 'failed' })];

    const result = consensus.resolve('Majority', steps);

    expect(result.outcome).toBe('unresolved');
  });

  it.each(['Weighted', 'Unanimous', 'Confidence'] as const)(
    'returns not_implemented for the %s strategy instead of throwing',
    (strategyName) => {
      const result = consensus.resolve(strategyName, [step()]);

      expect(result.outcome).toBe('not_implemented');
      expect(result.strategy).toBe(strategyName);
    },
  );
});
