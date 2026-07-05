import { BrainContext } from '../../../../../infrastructure/ai-brain/brain-context.types';
import { KNOWLEDGE_FALLBACK_VERSION, KnowledgePlanningEngine } from '../knowledge-planning.engine';

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
    discovery: { profile: 'discovery-context-user-1' },
    assessment: { refs: ['assessment-session-1-1'] },
    assembledAt: '2026-07-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('KnowledgePlanningEngine', () => {
  it('deterministically generates the same plan for the same context', () => {
    const engine = new KnowledgePlanningEngine();
    const first = engine.generate(buildContext());
    const second = engine.generate(buildContext());

    expect(first).toEqual(second);
  });

  it('derives recommendations from the goal, roadmap, assessment history, and discovery profile', () => {
    const engine = new KnowledgePlanningEngine();
    const plan = engine.generate(buildContext());

    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.recommendations[0].rationale).toContain('node-1');
    expect(plan.recommendations[1].rationale).toContain('assessment-session-1-1');
    expect(plan.recommendations[2].rationale).toContain('discovery-context-user-1');
    expect(plan.focusSummary).toContain(KNOWLEDGE_FALLBACK_VERSION);
    expect(plan.primaryTopic).toBe(plan.recommendations[0].topic);
    expect(plan.knowledgeId).toBe('knowledge-user-1-2026-07-03T00:00:00.000Z');
  });

  it('falls back to a generic rationale when assessment history is unavailable', () => {
    const engine = new KnowledgePlanningEngine();
    const plan = engine.generate(buildContext({ assessment: undefined }));

    expect(plan.recommendations[1].rationale).toContain('no prior assessment history available');
  });
});
