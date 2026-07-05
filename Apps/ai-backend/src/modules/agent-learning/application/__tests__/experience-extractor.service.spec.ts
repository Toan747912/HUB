import { CompletedExecutionInput } from '../../domain/experience';
import { ExperienceExtractorService } from '../experience-extractor.service';

function input(overrides: Partial<CompletedExecutionInput> = {}): CompletedExecutionInput {
  return {
    workflowId: 'workflow-1',
    goal: 'ship the feature',
    sourceType: 'coordination',
    status: 'success',
    ...overrides,
  };
}

describe('ExperienceExtractorService', () => {
  let service: ExperienceExtractorService;

  beforeEach(() => {
    service = new ExperienceExtractorService();
  });

  it('normalizes a minimal completed execution into an Experience', () => {
    const experience = service.extract(input());

    expect(experience.experienceId).toEqual(expect.any(String));
    expect(experience.workflowId).toBe('workflow-1');
    expect(experience.goal).toBe('ship the feature');
    expect(experience.sourceType).toBe('coordination');
    expect(experience.success).toBe(true);
    expect(experience.participants).toEqual([]);
    expect(experience.roles).toEqual({});
    expect(experience.artifacts).toEqual([]);
    expect(experience.messages).toEqual([]);
    expect(experience.errors).toEqual([]);
    expect(experience.confidence).toBe(0);
    expect(experience.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('maps status "failure" to success: false and carries errors through', () => {
    const experience = service.extract(input({ status: 'failure', errors: ['boom'] }));

    expect(experience.success).toBe(false);
    expect(experience.errors).toEqual(['boom']);
  });

  it('computes durationMs from startedAt/endedAt when durationMs is not given directly', () => {
    const experience = service.extract(input({ startedAt: 1000, endedAt: 1500 }));

    expect(experience.durationMs).toBe(500);
  });

  it('prefers an explicit durationMs over the started/ended delta', () => {
    const experience = service.extract(input({ startedAt: 1000, endedAt: 1500, durationMs: 9999 }));

    expect(experience.durationMs).toBe(9999);
  });

  it('normalizes artifacts, falling back to agentId then "unknown" for producedBy', () => {
    const experience = service.extract(
      input({
        artifacts: [
          { artifactId: 'a-1', type: 'research_notes', producedBy: 'Researcher' },
          { type: 'draft_plan', agentId: 'analyst-agent' },
          {},
        ],
      }),
    );

    expect(experience.artifacts).toEqual([
      { artifactId: 'a-1', type: 'research_notes', producedBy: 'Researcher' },
      { artifactId: 'artifact-1', type: 'draft_plan', producedBy: 'analyst-agent' },
      { artifactId: 'artifact-2', type: 'unknown', producedBy: 'unknown' },
    ]);
  });

  it('clamps confidence into [0, 1] and defaults missing/NaN confidence to 0', () => {
    expect(service.extract(input({ confidence: 1.5 })).confidence).toBe(1);
    expect(service.extract(input({ confidence: -0.5 })).confidence).toBe(0);
    expect(service.extract(input({ confidence: Number.NaN })).confidence).toBe(0);
    expect(service.extract(input({ confidence: 0.42 })).confidence).toBe(0.42);
  });

  it('carries consensus and plannerCapability through untouched when present', () => {
    const experience = service.extract(
      input({ consensus: { strategy: 'Majority', outcome: 'resolved', agreementScore: 0.9 }, plannerCapability: 'discovery_planner' }),
    );

    expect(experience.consensus).toEqual({ strategy: 'Majority', outcome: 'resolved', agreementScore: 0.9 });
    expect(experience.plannerCapability).toBe('discovery_planner');
  });

  it('produces a distinct experienceId for every call', () => {
    const first = service.extract(input());
    const second = service.extract(input());

    expect(first.experienceId).not.toBe(second.experienceId);
  });
});
