import { RoadmapPlanningEngine } from '../roadmap-planning.engine';
import { PlanningInput } from '../roadmap-planning.types';

const baseInput: PlanningInput = {
  goalId: 'goal-1',
  learnerId: 'learner-1',
  title: 'Learn Distributed Systems',
  description: 'Deep dive into consensus, replication, and partitioning',
  goalType: 'SKILL',
  difficulty: 'INTERMEDIATE',
  priority: 'MEDIUM',
  constraints: ['5 hours/week'],
  targetDate: '2027-01-01'
};

describe('RoadmapPlanningEngine', () => {
  const engine = new RoadmapPlanningEngine();

  it('is reproducible: identical input yields an identical plan', () => {
    const first = engine.generate(baseInput);
    const second = engine.generate({ ...baseInput });

    expect(second).toEqual(first);
  });

  it('produces more phases for higher difficulty', () => {
    const beginner = engine.generate({ ...baseInput, difficulty: 'BEGINNER' });
    const expert = engine.generate({ ...baseInput, difficulty: 'EXPERT' });

    expect(expert.phases.length).toBeGreaterThan(beginner.phases.length);
  });

  it('every phase contains at least one milestone and every milestone at least one task', () => {
    const plan = engine.generate(baseInput);

    expect(plan.phases.length).toBeGreaterThan(0);
    for (const phase of plan.phases) {
      expect(phase.milestones.length).toBeGreaterThan(0);
      for (const milestone of phase.milestones) {
        expect(milestone.tasks.length).toBeGreaterThan(0);
      }
    }
  });

  it('orders tasks with a single linear dependency chain across the whole roadmap', () => {
    const plan = engine.generate(baseInput);
    const allTasks = plan.phases.flatMap((phase) => phase.milestones.flatMap((milestone) => milestone.tasks));

    expect(allTasks[0].dependsOn).toEqual([]);
    for (let i = 1; i < allTasks.length; i++) {
      expect(allTasks[i].dependsOn).toEqual([allTasks[i - 1].id]);
    }
  });

  it('estimates a positive total duration that reflects goal complexity', () => {
    const plan = engine.generate(baseInput);
    expect(plan.estimatedDurationDays).toBeGreaterThan(0);
    expect(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).toContain(plan.complexity);
  });

  it('compresses per-task duration estimates for higher-priority goals (priority balancing)', () => {
    const low = engine.generate({ ...baseInput, priority: 'LOW' });
    const critical = engine.generate({ ...baseInput, priority: 'CRITICAL' });

    const lowFirstTaskDays = low.phases[0].milestones[0].tasks[0].estimatedDurationDays;
    const criticalFirstTaskDays = critical.phases[0].milestones[0].tasks[0].estimatedDurationDays;

    expect(criticalFirstTaskDays).toBeLessThanOrEqual(lowFirstTaskDays);
  });

  it('increases complexity score with more constraints', () => {
    const fewConstraints = engine.generate({ ...baseInput, constraints: [] });
    const manyConstraints = engine.generate({
      ...baseInput,
      constraints: ['a', 'b', 'c', 'd', 'e']
    });

    const rank = (value: string) => ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].indexOf(value);
    expect(rank(manyConstraints.complexity)).toBeGreaterThanOrEqual(rank(fewConstraints.complexity));
  });
});
