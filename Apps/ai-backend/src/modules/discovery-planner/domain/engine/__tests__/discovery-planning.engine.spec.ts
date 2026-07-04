import { BrainContext } from '../../../../../infrastructure/ai-brain/brain-context.types';
import { DISCOVERY_FALLBACK_VERSION, DiscoveryPlanningEngine } from '../discovery-planning.engine';

function buildContext(): BrainContext {
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
    assembledAt: '2026-07-03T00:00:00.000Z',
  };
}

describe('DiscoveryPlanningEngine', () => {
  it('deterministically generates the same plan for the same context', () => {
    const engine = new DiscoveryPlanningEngine();
    const first = engine.generate(buildContext());
    const second = engine.generate(buildContext());

    expect(first).toEqual(second);
  });

  it('derives suggestions from the discovery profile and recommendation state', () => {
    const engine = new DiscoveryPlanningEngine();
    const plan = engine.generate(buildContext());

    expect(plan.suggestions.length).toBeGreaterThan(0);
    expect(plan.suggestions[0].rationale).toContain('discovery-context-user-1');
    expect(plan.focusSummary).toContain(DISCOVERY_FALLBACK_VERSION);
    expect(plan.primaryFocus).toBe(plan.suggestions[0].skillFocus);
    expect(plan.discoveryId).toBe('discovery-user-1-2026-07-03T00:00:00.000Z');
  });
});
