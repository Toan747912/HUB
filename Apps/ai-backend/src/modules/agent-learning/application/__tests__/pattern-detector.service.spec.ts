import { Experience } from '../../domain/experience';
import { PatternDetectorService } from '../pattern-detector.service';

function experience(overrides: Partial<Experience> = {}): Experience {
  return {
    experienceId: `exp-${Math.random()}`,
    workflowId: 'workflow-1',
    goal: 'goal',
    sourceType: 'coordination',
    participants: [],
    roles: {},
    artifacts: [],
    messages: [],
    durationMs: 100,
    success: true,
    confidence: 0.5,
    errors: [],
    capturedAt: Date.now(),
    ...overrides,
  };
}

describe('PatternDetectorService', () => {
  let service: PatternDetectorService;

  beforeEach(() => {
    service = new PatternDetectorService();
  });

  it('returns no patterns for an empty experience set', () => {
    expect(service.detect([])).toEqual([]);
  });

  it('detects a successful_workflow pattern when a workflow succeeds >=80% of the time', () => {
    const experiences = [
      experience({ workflowId: 'wf-a', success: true }),
      experience({ workflowId: 'wf-a', success: true }),
      experience({ workflowId: 'wf-a', success: true }),
      experience({ workflowId: 'wf-a', success: true }),
      experience({ workflowId: 'wf-a', success: false }),
    ];

    const patterns = service.detect(experiences);
    const pattern = patterns.find((p) => p.category === 'successful_workflow');

    expect(pattern).toBeDefined();
    expect(pattern?.subject).toBe('wf-a');
    expect(pattern?.evidence.occurrences).toBe(5);
  });

  it('detects a frequent_failure pattern when a workflow fails >=50% of the time', () => {
    const experiences = [
      experience({ workflowId: 'wf-b', success: false }),
      experience({ workflowId: 'wf-b', success: false }),
      experience({ workflowId: 'wf-b', success: true }),
    ];

    const patterns = service.detect(experiences);
    const pattern = patterns.find((p) => p.category === 'frequent_failure');

    expect(pattern).toBeDefined();
    expect(pattern?.subject).toBe('wf-b');
  });

  it('does not flag a single-run workflow (below the minimum sample size)', () => {
    const patterns = service.detect([experience({ workflowId: 'wf-solo', success: false })]);

    expect(patterns.find((p) => p.category === 'frequent_failure')).toBeUndefined();
    expect(patterns.find((p) => p.category === 'successful_workflow')).toBeUndefined();
  });

  it('detects a tool_usage_trend pattern for an artifact type produced multiple times', () => {
    const experiences = [
      experience({ artifacts: [{ artifactId: 'a1', type: 'research_notes', producedBy: 'r' }] }),
      experience({ artifacts: [{ artifactId: 'a2', type: 'research_notes', producedBy: 'r' }] }),
    ];

    const patterns = service.detect(experiences);
    const pattern = patterns.find((p) => p.category === 'tool_usage_trend');

    expect(pattern).toBeDefined();
    expect(pattern?.subject).toBe('research_notes');
  });

  it('detects a planner_confidence_trend pattern when confidence moves across runs for the same capability', () => {
    const older = experience({ plannerCapability: 'discovery_planner', confidence: 0.4, capturedAt: 1000 });
    const newer = experience({ plannerCapability: 'discovery_planner', confidence: 0.9, capturedAt: 2000 });

    const patterns = service.detect([older, newer]);
    const pattern = patterns.find((p) => p.category === 'planner_confidence_trend');

    expect(pattern).toBeDefined();
    expect(pattern?.subject).toBe('discovery_planner');
    expect(pattern?.description).toContain('increasing');
  });

  it('detects a consensus_quality pattern from agreement scores grouped by strategy', () => {
    const experiences = [
      experience({ consensus: { strategy: 'Majority', outcome: 'resolved', agreementScore: 0.9 } }),
      experience({ consensus: { strategy: 'Majority', outcome: 'resolved', agreementScore: 0.8 } }),
    ];

    const patterns = service.detect(experiences);
    const pattern = patterns.find((p) => p.category === 'consensus_quality');

    expect(pattern).toBeDefined();
    expect(pattern?.subject).toBe('Majority');
    expect(pattern?.description).toContain('high');
  });

  it('detects an artifact_reuse pattern when a type appears across multiple distinct experiences', () => {
    const experiences = [
      experience({ artifacts: [{ artifactId: 'a1', type: 'evidence', producedBy: 'r' }] }),
      experience({ artifacts: [{ artifactId: 'a2', type: 'evidence', producedBy: 'r' }] }),
      experience({ artifacts: [{ artifactId: 'a3', type: 'summary', producedBy: 'r' }] }),
    ];

    const patterns = service.detect(experiences);
    const pattern = patterns.find((p) => p.category === 'artifact_reuse');

    expect(pattern).toBeDefined();
    expect(pattern?.subject).toBe('evidence');
    expect(pattern?.evidence.metrics?.distinctExecutions).toBe(2);
  });

  it('detects a role_effectiveness pattern for a role appearing across multiple runs', () => {
    const experiences = [
      experience({ roles: { Researcher: 'researcher-agent' }, success: true }),
      experience({ roles: { Researcher: 'researcher-agent' }, success: false }),
    ];

    const patterns = service.detect(experiences);
    const pattern = patterns.find((p) => p.category === 'role_effectiveness');

    expect(pattern).toBeDefined();
    expect(pattern?.subject).toBe('Researcher');
    expect(pattern?.evidence.metrics?.successRate).toBe(0.5);
  });

  it('detects a message_bottleneck pattern when a run exchanges an unusually high number of messages', () => {
    const experiences = [
      experience({ workflowId: 'wf-chatty', messages: Array.from({ length: 8 }, (_, i) => `m${i}`) }),
    ];

    const patterns = service.detect(experiences);
    const pattern = patterns.find((p) => p.category === 'message_bottleneck');

    expect(pattern).toBeDefined();
    expect(pattern?.subject).toBe('wf-chatty');
  });

  it('keeps every pattern confidence within [0, 1]', () => {
    const experiences = [
      experience({ workflowId: 'wf-a', success: true }),
      experience({ workflowId: 'wf-a', success: true }),
    ];

    const patterns = service.detect(experiences);
    for (const pattern of patterns) {
      expect(pattern.confidence).toBeGreaterThanOrEqual(0);
      expect(pattern.confidence).toBeLessThanOrEqual(1);
    }
  });
});
