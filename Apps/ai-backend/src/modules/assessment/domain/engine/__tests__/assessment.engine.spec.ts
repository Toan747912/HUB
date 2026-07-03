import { AssessmentEngine } from '../assessment.engine';
import { AssessmentInput } from '../assessment-engine.types';

const baseInput: AssessmentInput = {
  goalId: 'goal-1',
  roadmapId: 'roadmap-1',
  learnerId: 'learner-1',
  roadmapCompletionRatio: 75,
  tasks: [
    {
      id: 't1',
      skillId: 'Foundations',
      completed: true,
      estimatedDurationDays: 2,
      actualDurationDays: 2,
    },
    {
      id: 't2',
      skillId: 'Foundations',
      completed: true,
      estimatedDurationDays: 2,
      actualDurationDays: 2,
    },
    { id: 't3', skillId: 'Advanced Practice', completed: false, estimatedDurationDays: 4 },
    {
      id: 't4',
      skillId: 'Advanced Practice',
      completed: true,
      estimatedDurationDays: 4,
      actualDurationDays: 5,
    },
  ],
  revisionCount: 0,
  previousRuns: [],
};

describe('AssessmentEngine', () => {
  const engine = new AssessmentEngine();

  it('is deterministic: identical input yields an identical computation', () => {
    const first = engine.evaluate(baseInput);
    const second = engine.evaluate({ ...baseInput, tasks: baseInput.tasks.map((t) => ({ ...t })) });

    expect(second).toEqual(first);
  });

  it('infers competency per skill area from task completion ratio', () => {
    const result = engine.evaluate(baseInput);
    const foundations = result.competencies.find((c) => c.skillId === 'Foundations')!;
    const advanced = result.competencies.find((c) => c.skillId === 'Advanced Practice')!;

    expect(foundations.score).toBe(100);
    expect(foundations.level).toBe('EXPERT');
    expect(advanced.score).toBe(50);
  });

  it('detects a knowledge gap for skill areas below the readiness threshold', () => {
    const result = engine.evaluate({
      ...baseInput,
      tasks: [
        { id: 't1', skillId: 'Weak Area', completed: false, estimatedDurationDays: 2 },
        { id: 't2', skillId: 'Weak Area', completed: false, estimatedDurationDays: 2 },
        {
          id: 't3',
          skillId: 'Strong Area',
          completed: true,
          estimatedDurationDays: 2,
          actualDurationDays: 2,
        },
      ],
    });

    expect(result.knowledgeGaps).toHaveLength(1);
    expect(result.knowledgeGaps[0].skillId).toBe('Weak Area');
    expect(result.weakAreas).toContain('Weak Area');
    expect(result.strongAreas).toContain('Strong Area');
  });

  it('produces no gaps when every skill area is above the threshold', () => {
    const result = engine.evaluate({
      ...baseInput,
      tasks: [
        {
          id: 't1',
          skillId: 'Solid',
          completed: true,
          estimatedDurationDays: 2,
          actualDurationDays: 2,
        },
      ],
    });

    expect(result.knowledgeGaps).toHaveLength(0);
  });

  it('confidence score stays within [0, 100] and reacts to revision churn', () => {
    const stable = engine.evaluate({ ...baseInput, revisionCount: 0 });
    const churned = engine.evaluate({ ...baseInput, revisionCount: 10 });

    expect(stable.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(stable.confidenceScore).toBeLessThanOrEqual(100);
    expect(churned.confidenceScore).toBeLessThanOrEqual(stable.confidenceScore);
  });

  it('confidence is stable (bonus) when previous runs show low variance, and penalized when volatile', () => {
    const stableHistory = engine.evaluate({
      ...baseInput,
      previousRuns: [
        { confidenceScore: 70, readiness: 'READY', computedAt: '2027-01-01T00:00:00.000Z' },
        { confidenceScore: 71, readiness: 'READY', computedAt: '2027-01-02T00:00:00.000Z' },
        { confidenceScore: 69, readiness: 'READY', computedAt: '2027-01-03T00:00:00.000Z' },
      ],
    });

    const volatileHistory = engine.evaluate({
      ...baseInput,
      previousRuns: [
        { confidenceScore: 20, readiness: 'AT_RISK', computedAt: '2027-01-01T00:00:00.000Z' },
        { confidenceScore: 90, readiness: 'READY', computedAt: '2027-01-02T00:00:00.000Z' },
        { confidenceScore: 15, readiness: 'AT_RISK', computedAt: '2027-01-03T00:00:00.000Z' },
      ],
    });

    expect(stableHistory.confidenceScore).toBeGreaterThan(volatileHistory.confidenceScore);
  });

  it('calculates READY only with high completion, no critical gaps, and sufficient confidence', () => {
    const ready = engine.evaluate({
      ...baseInput,
      roadmapCompletionRatio: 95,
      tasks: [
        {
          id: 't1',
          skillId: 'Solid',
          completed: true,
          estimatedDurationDays: 2,
          actualDurationDays: 2,
        },
      ],
    });
    expect(ready.readiness).toBe('READY');

    const atRisk = engine.evaluate({
      ...baseInput,
      roadmapCompletionRatio: 10,
      tasks: [
        { id: 't1', skillId: 'Weak', completed: false, estimatedDurationDays: 2 },
        { id: 't2', skillId: 'Weak', completed: false, estimatedDurationDays: 2 },
        { id: 't3', skillId: 'Weak', completed: false, estimatedDurationDays: 2 },
      ],
    });
    expect(atRisk.readiness).toBe('AT_RISK');
  });
});
