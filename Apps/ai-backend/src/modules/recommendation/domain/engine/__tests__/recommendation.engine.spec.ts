import { RecommendationEngine } from '../recommendation.engine';
import { RecommendationInput } from '../recommendation-engine.types';

const baseInput: RecommendationInput = {
  goalId: 'goal-1',
  roadmapId: 'roadmap-1',
  assessmentId: 'assessment-1',
  learnerId: 'learner-1',
  goalPriority: 'MEDIUM',
  goalDifficulty: 'INTERMEDIATE',
  targetDate: '2027-06-01T00:00:00.000Z',
  referenceDate: '2027-01-01T00:00:00.000Z',
  roadmapCompletionRatio: 60,
  revisionCount: 0,
  tasks: [
    {
      id: 't1',
      skillId: 'Foundations',
      completed: true,
      order: 1,
      dependsOn: [],
      estimatedDurationDays: 2,
      actualDurationDays: 2,
    },
    {
      id: 't2',
      skillId: 'Foundations',
      completed: false,
      order: 2,
      dependsOn: ['t1'],
      estimatedDurationDays: 3,
    },
  ],
  competencies: [{ skillId: 'Foundations', score: 60, level: 'PROFICIENT' }],
  knowledgeGaps: [],
  confidenceScore: 70,
  readiness: 'NOT_READY',
};

describe('RecommendationEngine', () => {
  const engine = new RecommendationEngine();

  it('is deterministic: identical input yields an identical computation', () => {
    const first = engine.evaluate(baseInput);
    const second = engine.evaluate({ ...baseInput, tasks: baseInput.tasks.map((t) => ({ ...t })) });
    expect(second).toEqual(first);
  });

  it('every generated item includes reason, evidence, scores, and the affected Goal/Roadmap/Assessment ids', () => {
    const result = engine.evaluate(baseInput);
    expect(result.items.length).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item.reason.summary.length).toBeGreaterThan(0);
      expect(item.reason.evidence.length).toBeGreaterThan(0);
      expect(item.scores.priorityScore).toBeGreaterThanOrEqual(0);
      expect(item.affectedGoalId).toBe('goal-1');
      expect(item.affectedRoadmapId).toBe('roadmap-1');
      expect(item.affectedAssessmentId).toBe('assessment-1');
    }
  });

  it('produces a TASK_PRIORITY item only for skill areas with incomplete tasks', () => {
    const result = engine.evaluate(baseInput);
    const taskPriorityItems = result.items.filter((i) => i.type === 'TASK_PRIORITY');
    expect(taskPriorityItems).toHaveLength(1);
    expect(taskPriorityItems[0].skillId).toBe('Foundations');
  });

  describe('gap handling', () => {
    it('produces a REVIEW_SCHEDULE item and a scheduled review when a knowledge gap exists', () => {
      const result = engine.evaluate({
        ...baseInput,
        knowledgeGaps: [
          { skillId: 'Foundations', weight: 'HIGH', reason: 'Completion below threshold' },
        ],
      });
      expect(result.reviewSchedules).toHaveLength(1);
      expect(result.reviewSchedules[0].intervalDays).toBe(3);
      expect(result.items.some((i) => i.type === 'REVIEW_SCHEDULE')).toBe(true);
    });

    it('produces no review schedule when there is no gap', () => {
      const result = engine.evaluate(baseInput);
      expect(result.reviewSchedules).toHaveLength(0);
    });
  });

  describe('difficulty adjustment', () => {
    it('suggests decreasing difficulty when perceived difficulty far exceeds competency', () => {
      const result = engine.evaluate({
        ...baseInput,
        goalDifficulty: 'EXPERT',
        competencies: [{ skillId: 'Foundations', score: 10, level: 'NOVICE' }],
      });
      const item = result.items.find((i) => i.type === 'DIFFICULTY_ADJUSTMENT');
      expect(item).toBeDefined();
      expect(item!.reason.summary).toMatch(/Decrease difficulty/);
    });

    it('suggests increasing difficulty when competency has outpaced a low difficulty setting', () => {
      const result = engine.evaluate({
        ...baseInput,
        goalDifficulty: 'BEGINNER',
        competencies: [{ skillId: 'Foundations', score: 95, level: 'EXPERT' }],
      });
      const item = result.items.find((i) => i.type === 'DIFFICULTY_ADJUSTMENT');
      expect(item).toBeDefined();
      expect(item!.reason.summary).toMatch(/Increase difficulty/);
    });

    it('suggests no adjustment when difficulty and competency are aligned', () => {
      const result = engine.evaluate(baseInput);
      expect(result.items.some((i) => i.type === 'DIFFICULTY_ADJUSTMENT')).toBe(false);
    });
  });

  describe('strategy selection', () => {
    const strategyInput = (overrides: Partial<RecommendationInput>): RecommendationInput => ({
      ...baseInput,
      tasks: [
        {
          id: 'x1',
          skillId: 'X',
          completed: true,
          order: 1,
          dependsOn: [],
          estimatedDurationDays: 2,
          actualDurationDays: 2,
        },
      ],
      competencies: [{ skillId: 'X', score: 60, level: 'PROFICIENT' }],
      knowledgeGaps: [],
      revisionCount: 0,
      ...overrides,
    });

    const strategyFor = (input: RecommendationInput): string => {
      const result = engine.evaluate(input);
      return result.learningStrategies.find((s) => s.skillId === 'X')!.strategy;
    };

    it('selects RECOVERY for a CRITICAL gap with very low competency', () => {
      const strategy = strategyFor(
        strategyInput({
          competencies: [{ skillId: 'X', score: 20, level: 'NOVICE' }],
          knowledgeGaps: [{ skillId: 'X', weight: 'CRITICAL', reason: 'severe gap' }],
        }),
      );
      expect(strategy).toBe('RECOVERY');
    });

    it('selects DEEP_DIVE for a HIGH gap with moderate competency', () => {
      const strategy = strategyFor(
        strategyInput({
          competencies: [{ skillId: 'X', score: 50, level: 'PROFICIENT' }],
          knowledgeGaps: [{ skillId: 'X', weight: 'HIGH', reason: 'notable gap' }],
        }),
      );
      expect(strategy).toBe('DEEP_DIVE');
    });

    it('selects REPEAT for a completed task that significantly overran its estimate', () => {
      const strategy = strategyFor(
        strategyInput({
          tasks: [
            {
              id: 'x1',
              skillId: 'X',
              completed: true,
              order: 1,
              dependsOn: [],
              estimatedDurationDays: 2,
              actualDurationDays: 5,
            },
          ],
          competencies: [{ skillId: 'X', score: 70, level: 'PROFICIENT' }],
        }),
      );
      expect(strategy).toBe('REPEAT');
    });

    it('selects REVIEW for low competency with no gap and no overrun', () => {
      const strategy = strategyFor(
        strategyInput({ competencies: [{ skillId: 'X', score: 30, level: 'DEVELOPING' }] }),
      );
      expect(strategy).toBe('REVIEW');
    });

    it('selects PRACTICE for developing competency with no gap', () => {
      const strategy = strategyFor(
        strategyInput({ competencies: [{ skillId: 'X', score: 60, level: 'PROFICIENT' }] }),
      );
      expect(strategy).toBe('PRACTICE');
    });

    it('selects SLOW_DOWN when revision churn is high and competency is not yet mastered', () => {
      const strategy = strategyFor(
        strategyInput({
          competencies: [{ skillId: 'X', score: 75, level: 'ADVANCED' }],
          revisionCount: 6,
        }),
      );
      expect(strategy).toBe('SLOW_DOWN');
    });

    it('selects ADVANCE for solid competency with low revision churn', () => {
      const strategy = strategyFor(
        strategyInput({
          competencies: [{ skillId: 'X', score: 75, level: 'ADVANCED' }],
          revisionCount: 0,
        }),
      );
      expect(strategy).toBe('ADVANCE');
    });

    it('selects SKIP for mastered competency with no gap', () => {
      const strategy = strategyFor(
        strategyInput({ competencies: [{ skillId: 'X', score: 95, level: 'EXPERT' }] }),
      );
      expect(strategy).toBe('SKIP');
    });
  });

  describe('roadmap adjustment logic', () => {
    it('suggests extending the target date when readiness is AT_RISK and urgency is high', () => {
      const result = engine.evaluate({
        ...baseInput,
        readiness: 'AT_RISK',
        referenceDate: '2027-05-20T00:00:00.000Z',
        tasks: [
          {
            id: 't2',
            skillId: 'Foundations',
            completed: false,
            order: 1,
            dependsOn: [],
            estimatedDurationDays: 60,
          },
        ],
      });
      expect(
        result.items.some(
          (i) => i.type === 'ROADMAP_ADJUSTMENT' && /Extend target date/.test(i.reason.summary),
        ),
      ).toBe(true);
    });

    it('suggests regenerating the roadmap when 2+ CRITICAL gaps are present', () => {
      const result = engine.evaluate({
        ...baseInput,
        knowledgeGaps: [
          { skillId: 'A', weight: 'CRITICAL', reason: 'gap A' },
          { skillId: 'B', weight: 'CRITICAL', reason: 'gap B' },
        ],
      });
      expect(
        result.items.some(
          (i) => i.type === 'ROADMAP_ADJUSTMENT' && /Regenerate roadmap/.test(i.reason.summary),
        ),
      ).toBe(true);
    });

    it('suggests reducing scope when revision churn is very high', () => {
      const result = engine.evaluate({ ...baseInput, revisionCount: 9 });
      expect(
        result.items.some(
          (i) => i.type === 'ROADMAP_ADJUSTMENT' && /Reduce scope/.test(i.reason.summary),
        ),
      ).toBe(true);
    });

    it('produces no roadmap adjustment items when everything is healthy', () => {
      const result = engine.evaluate({
        ...baseInput,
        readiness: 'READY',
        revisionCount: 0,
        knowledgeGaps: [],
      });
      expect(result.items.some((i) => i.type === 'ROADMAP_ADJUSTMENT')).toBe(false);
    });
  });

  describe('dependency analysis / priority decisions', () => {
    it('marks a task blocked when its dependency is incomplete, and unblocked once satisfiable', () => {
      const result = engine.evaluate(baseInput);
      const decision = result.priorityDecisions.find((d) => d.taskId === 't2')!;
      expect(decision.blocked).toBe(false); // t1 (its dependency) is completed in baseInput

      const blockedInput: RecommendationInput = {
        ...baseInput,
        tasks: [
          {
            id: 't1',
            skillId: 'Foundations',
            completed: false,
            order: 1,
            dependsOn: [],
            estimatedDurationDays: 2,
          },
          {
            id: 't2',
            skillId: 'Foundations',
            completed: false,
            order: 2,
            dependsOn: ['t1'],
            estimatedDurationDays: 3,
          },
        ],
      };
      const blockedResult = engine.evaluate(blockedInput);
      const blockedDecision = blockedResult.priorityDecisions.find((d) => d.taskId === 't2')!;
      expect(blockedDecision.blocked).toBe(true);
      expect(blockedDecision.priorityScore).toBe(0);
    });

    it('orders unblocked tasks by descending priority score, blocked tasks last', () => {
      const input: RecommendationInput = {
        ...baseInput,
        tasks: [
          {
            id: 't1',
            skillId: 'Foundations',
            completed: false,
            order: 1,
            dependsOn: ['missing'],
            estimatedDurationDays: 2,
          },
          {
            id: 't2',
            skillId: 'Foundations',
            completed: false,
            order: 2,
            dependsOn: [],
            estimatedDurationDays: 2,
          },
        ],
      };
      const result = engine.evaluate(input);
      expect(result.priorityDecisions[0].taskId).toBe('t2');
      expect(result.priorityDecisions[0].blocked).toBe(false);
      expect(result.priorityDecisions[1].taskId).toBe('t1');
      expect(result.priorityDecisions[1].blocked).toBe(true);
    });
  });

  describe('priority scoring', () => {
    it('priority score stays within [0, 100] and rises with need/urgency/risk', () => {
      const low = engine.evaluate({ ...baseInput, roadmapCompletionRatio: 90, revisionCount: 0 });
      const high = engine.evaluate({
        ...baseInput,
        roadmapCompletionRatio: 10,
        revisionCount: 8,
        knowledgeGaps: [{ skillId: 'Foundations', weight: 'CRITICAL', reason: 'severe' }],
        readiness: 'AT_RISK',
      });

      const lowItem = low.items.find((i) => i.type === 'TASK_PRIORITY')!;
      const highItem = high.items.find((i) => i.type === 'TASK_PRIORITY')!;

      expect(lowItem.scores.priorityScore).toBeGreaterThanOrEqual(0);
      expect(lowItem.scores.priorityScore).toBeLessThanOrEqual(100);
      expect(highItem.scores.priorityScore).toBeGreaterThan(lowItem.scores.priorityScore);
    });
  });
});
