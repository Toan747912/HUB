import { BrainContext } from '../../../../../infrastructure/ai-brain/brain-context.types';
import { MISSION_FALLBACK_VERSION, MissionPlanningEngine } from '../mission-planning.engine';

function buildContext(overrides: Partial<BrainContext> = {}): BrainContext {
  return {
    userId: 'user-1',
    goalId: 'goal-1',
    sessionId: 'session-1',
    traceId: 'trace-1',
    goal: { id: 'goal-1', title: 'Become production-ready' },
    roadmap: { nodeId: 'node-1', status: 'ACTIVE' },
    session: { id: 'session-1', phase: 'ACTIVE' },
    recommendation: { state: 'priority-for-user-1' },
    assembledAt: '2026-07-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('MissionPlanningEngine', () => {
  it('is deterministic: identical BrainContext yields an identical MissionPlan', () => {
    const engine = new MissionPlanningEngine();
    const context = buildContext();

    const first = engine.generate(context);
    const second = engine.generate(context);

    expect(second).toEqual(first);
  });

  it('produces at least one task per context source (roadmap, recommendation, review)', () => {
    const engine = new MissionPlanningEngine();
    const plan = engine.generate(buildContext());

    const sources = plan.tasks.map((t) => t.source);
    expect(sources).toContain('roadmap');
    expect(sources).toContain('recommendation');
    expect(sources).toContain('review');
  });

  it('derives the mission date from the context assembly timestamp', () => {
    const engine = new MissionPlanningEngine();
    const plan = engine.generate(buildContext({ assembledAt: '2026-01-15T10:30:00.000Z' }));

    expect(plan.date).toBe('2026-01-15');
  });

  it('scopes ids and content to the given goal, session, and roadmap state', () => {
    const engine = new MissionPlanningEngine();
    const plan = engine.generate(
      buildContext({
        goalId: 'goal-42',
        sessionId: 'session-77',
        roadmap: { nodeId: 'node-99', status: 'BLOCKED' },
      }),
    );

    expect(plan.missionId).toContain('goal-42');
    expect(plan.tasks.some((t) => t.id.includes('goal-42'))).toBe(true);
    expect(plan.tasks.some((t) => t.id.includes('session-77'))).toBe(true);
    expect(plan.tasks.some((t) => t.description.includes('node-99'))).toBe(true);
    expect(plan.focusSummary).toContain(MISSION_FALLBACK_VERSION);
  });

  it('every task has a positive estimated duration', () => {
    const engine = new MissionPlanningEngine();
    const plan = engine.generate(buildContext());

    for (const task of plan.tasks) {
      expect(task.estimatedMinutes).toBeGreaterThan(0);
    }
  });
});
