import { ReasoningArtifact } from '../../domain/reasoning-result';
import { ReasoningStep } from '../../domain/reasoning-step';
import { SynthesisService } from '../synthesis.service';

function step(overrides: Partial<ReasoningStep> = {}): ReasoningStep {
  return {
    stepId: 'step-1',
    role: 'Analyst',
    agentId: 'agent-1',
    input: {},
    output: {},
    confidence: 0.8,
    executionTime: 10,
    artifactsProduced: [],
    status: 'completed',
    ...overrides,
  };
}

describe('SynthesisService', () => {
  let synthesis: SynthesisService;

  beforeEach(() => {
    synthesis = new SynthesisService();
  });

  it('averages confidence across completed steps and lists distinct contributors', () => {
    const steps = [
      step({ agentId: 'a1', confidence: 0.6 }),
      step({ agentId: 'a2', confidence: 1.0 }),
      step({ agentId: 'a1', confidence: 0.5, status: 'failed' }),
    ];
    const artifacts: ReasoningArtifact[] = [];

    const result = synthesis.synthesize('session-1', steps, artifacts, { strategy: 'Majority', outcome: 'resolved' });

    expect(result.confidence).toBeCloseTo(0.8);
    expect(result.contributors).toEqual(['a1', 'a2']);
    expect(result.status).toBe('partial');
  });

  it('marks status success only when every step completed', () => {
    const steps = [step({ agentId: 'a1' }), step({ agentId: 'a2' })];

    const result = synthesis.synthesize('session-1', steps, [], { strategy: 'Majority', outcome: 'resolved' });

    expect(result.status).toBe('success');
  });

  it('carries the consensus result and artifacts through untouched', () => {
    const artifacts: ReasoningArtifact[] = [
      { artifactId: 'artifact-1', type: 'summary', producedBy: 'Summarizer', agentId: 'a1', content: {}, createdAt: 1 },
    ];
    const consensus = { strategy: 'Majority' as const, outcome: 'unresolved' as const, reason: 'no majority' };

    const result = synthesis.synthesize('session-1', [step()], artifacts, consensus);

    expect(result.artifacts).toBe(artifacts);
    expect(result.consensus).toEqual(consensus);
    expect(result.summary).toContain('Majority');
  });
});
