import { GoalId, LearnerId, RoadmapId, TaskId } from '../../../../../shared/domain/identifiers';
import { RoadmapPlanningEngine } from '../../engine/roadmap-planning.engine';
import { PlanningInput } from '../../engine/roadmap-planning.types';
import { Roadmap } from '../roadmap.aggregate';

const goalSnapshot: PlanningInput = {
  goalId: 'goal-1',
  learnerId: 'learner-1',
  title: 'Learn Distributed Systems',
  description: 'Deep dive into consensus, replication, and partitioning',
  goalType: 'SKILL',
  difficulty: 'BEGINNER',
  priority: 'MEDIUM',
  constraints: [],
  targetDate: '2027-01-01'
};

const context = { traceId: 't', correlationId: 'c', causationId: 'ca' };
const engine = new RoadmapPlanningEngine();

const makeRoadmap = (): Roadmap => {
  const plan = engine.generate(goalSnapshot);
  return Roadmap.create(
    { roadmapId: RoadmapId.create('roadmap-1'), goalId: GoalId.create('goal-1'), learnerId: LearnerId.create('learner-1'), goalSnapshot, plan },
    context
  );
};

describe('Roadmap aggregate', () => {
  it('creates a roadmap from a Goal decomposition with phases/milestones/tasks and emits RoadmapCreated', () => {
    const roadmap = makeRoadmap();

    expect(roadmap.getStatus()).toBe('DRAFT');
    expect(roadmap.getPhases().length).toBeGreaterThan(0);
    expect(roadmap.getRevisions()).toHaveLength(1);
    expect(roadmap.getRevisions()[0].reason).toBe('CREATED');

    const events = roadmap.pullEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('RoadmapCreated');
  });

  it('publishes a DRAFT roadmap and enforces the lifecycle invariant', () => {
    const roadmap = makeRoadmap();
    roadmap.pullEvents();

    roadmap.publish(context, roadmap.getAggregateVersion());
    expect(roadmap.getStatus()).toBe('PUBLISHED');

    const events = roadmap.pullEvents();
    expect(events[0].type).toBe('RoadmapPublished');

    // ARCHIVED and COMPLETED are terminal; no further mutation should be possible after archiving.
    roadmap.archive(context, roadmap.getAggregateVersion());
    expect(roadmap.getStatus()).toBe('ARCHIVED');
    expect(() => roadmap.publish(context, roadmap.getAggregateVersion())).toThrow();
  });

  it('rejects mutation with a stale expectedVersion (optimistic concurrency)', () => {
    const roadmap = makeRoadmap();
    roadmap.pullEvents();

    expect(() => roadmap.publish(context, 999)).toThrow();
  });

  it('computes progress across all tasks and completes the roadmap once every task is done', () => {
    const roadmap = makeRoadmap();
    roadmap.pullEvents();
    roadmap.publish(context, roadmap.getAggregateVersion());
    roadmap.pullEvents();

    const allTaskIds = roadmap
      .getPhases()
      .flatMap((phase) => phase.milestones.flatMap((milestone) => milestone.tasks.map((task) => task.id)));

    for (const taskId of allTaskIds.slice(0, -1)) {
      roadmap.completeTask(taskId, context, roadmap.getAggregateVersion());
    }
    expect(roadmap.getProgress().completionRatio).toBeLessThan(100);
    expect(roadmap.getStatus()).toBe('PUBLISHED');

    roadmap.completeTask(allTaskIds[allTaskIds.length - 1], context, roadmap.getAggregateVersion());
    expect(roadmap.getProgress().completionRatio).toBe(100);
    expect(roadmap.getStatus()).toBe('COMPLETED');

    const events = roadmap.pullEvents();
    expect(events[events.length - 1].type).toBe('RoadmapCompleted');
  });

  it('regenerate() replaces the plan and appends a new append-only revision without deleting prior history', () => {
    const roadmap = makeRoadmap();
    roadmap.pullEvents();

    const newPlan = engine.generate({ ...goalSnapshot, difficulty: 'EXPERT' });
    roadmap.regenerate(newPlan, context, roadmap.getAggregateVersion());

    expect(roadmap.getRevisions()).toHaveLength(2);
    expect(roadmap.getRevisions()[0].reason).toBe('CREATED');
    expect(roadmap.getRevisions()[1].reason).toBe('REGENERATED');
    expect(roadmap.getPhases().length).toBe(newPlan.phases.length);

    const events = roadmap.pullEvents();
    expect(events[0].type).toBe('RoadmapRegenerated');
  });

  it('rejects completing an unknown task id', () => {
    const roadmap = makeRoadmap();
    roadmap.pullEvents();
    roadmap.publish(context, roadmap.getAggregateVersion());

    expect(() => roadmap.completeTask(TaskId.create('does-not-exist'), context, roadmap.getAggregateVersion())).toThrow();
  });
});
