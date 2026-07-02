import { Goal } from '../src/modules/goal/domain/aggregates/goal.aggregate';
import { GoalConstraint } from '../src/modules/goal/domain/entities/goal-constraint.entity';
import { GoalMilestone } from '../src/modules/goal/domain/entities/goal-milestone.entity';
import { GoalDomainError } from '../src/modules/goal/domain/errors/goal-domain.error';
import { GoalDifficulty } from '../src/modules/goal/domain/value-objects/goal-difficulty.vo';
import { GoalPriority } from '../src/modules/goal/domain/value-objects/goal-priority.vo';
import { GoalType } from '../src/modules/goal/domain/value-objects/goal-type.vo';
import { TargetDate } from '../src/modules/goal/domain/value-objects/target-date.vo';

type TestCase = { name: string; run: () => void };

const context = { traceId: 't-1', correlationId: 'c-1', causationId: 'cmd-1' };

const createGoal = () =>
  Goal.create(
    {
      goalId: 'goal-1',
      learnerId: 'learner-1',
      title: 'Become Senior Backend Engineer',
      description: 'Master architecture, testing, and scalability',
      type: GoalType.create('SKILL'),
      difficulty: GoalDifficulty.create('ADVANCED'),
      priority: GoalPriority.create('HIGH'),
      targetDate: TargetDate.create('2030-01-01')
    },
    context
  );

const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(message);
};

const expectThrow = (fn: () => void, errorCode?: string): void => {
  let thrown = false;
  try {
    fn();
  } catch (error: unknown) {
    thrown = true;
    if (errorCode) {
      assert(error instanceof GoalDomainError, 'Expected GoalDomainError');
      if (error instanceof GoalDomainError) {
        assert(error.code === errorCode, `Expected ${errorCode} but got ${error.code}`);
      }
    }
  }
  assert(thrown, 'Expected function to throw');
};

const tests: TestCase[] = [
  {
    name: 'Lifecycle allows Draft -> Active -> InProgress -> Completed',
    run: () => {
      const goal = createGoal();
      goal.transitionTo('ACTIVE', context);
      goal.transitionTo('IN_PROGRESS', context);
      goal.transitionTo('COMPLETED', context);
      assert(goal.getStatus() === 'COMPLETED', 'Goal must be COMPLETED');
    }
  },
  {
    name: 'Lifecycle forbids Completed -> Active',
    run: () => {
      const goal = createGoal();
      goal.transitionTo('ACTIVE', context);
      goal.transitionTo('IN_PROGRESS', context);
      goal.transitionTo('COMPLETED', context);
      expectThrow(() => goal.transitionTo('ACTIVE', context), 'GOAL_TERMINAL_STATE_MUTATION_FORBIDDEN');
    }
  },
  {
    name: 'Version increments on mutation',
    run: () => {
      const goal = createGoal();
      const v1 = goal.getAggregateVersion();
      goal.addConstraint(new GoalConstraint('cons-1', 'timebox', '2h/day'), context);
      const v2 = goal.getAggregateVersion();
      assert(v2 === v1 + 1, `Expected version +1 (${v1} -> ${v2})`);
    }
  },
  {
    name: 'Concurrency expectedVersion mismatch throws conflict',
    run: () => {
      const goal = createGoal();
      const expected = goal.getAggregateVersion();
      goal.addConstraint(new GoalConstraint('cons-1', 'timebox', '2h/day'), context, expected);
      expectThrow(
        () => goal.addConstraint(new GoalConstraint('cons-2', 'scope', 'backend-only'), context, expected),
        'GOAL_VERSION_CONFLICT'
      );
    }
  },
  {
    name: 'Terminal state mutation forbidden',
    run: () => {
      const goal = createGoal();
      goal.transitionTo('ACTIVE', context);
      goal.transitionTo('IN_PROGRESS', context);
      goal.transitionTo('COMPLETED', context);
      expectThrow(
        () => goal.updateDefinition(
          'New title',
          'desc',
          GoalType.create('SKILL'),
          GoalDifficulty.create('ADVANCED'),
          GoalPriority.create('HIGH'),
          TargetDate.create('2030-02-01'),
          context
        ),
        'GOAL_TERMINAL_STATE_MUTATION_FORBIDDEN'
      );
    }
  },
  {
    name: 'Event contract contains required metadata fields',
    run: () => {
      const goal = createGoal();
      goal.pullEvents().forEach((event) => {
        assert(!!event.metadata.eventId, 'eventId missing');
        assert(!!event.metadata.aggregateId, 'aggregateId missing');
        assert(typeof event.metadata.aggregateVersion === 'number', 'aggregateVersion missing');
        assert(!!event.metadata.occurredAt, 'occurredAt missing');
        assert(!!event.metadata.traceId, 'traceId missing');
        assert(!!event.metadata.correlationId, 'correlationId missing');
        assert(!!event.metadata.causationId, 'causationId missing');
      });
    }
  },
  {
    name: 'Milestone reached emits event and updates progress',
    run: () => {
      const goal = createGoal();
      goal.addMilestone(new GoalMilestone('m-1', 'Finish architecture doc'));
      goal.reachMilestone('m-1', context);
      const events = goal.pullEvents();
      const reached = events.find((e) => e.type === 'GoalMilestoneReached');
      assert(!!reached, 'GoalMilestoneReached event missing');
      assert(goal.getProgress().completionRatio === 100, 'Progress should be 100 for single milestone');
    }
  }
];

let passed = 0;
console.log('Running Goal Domain Tests...');
for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`✅ ${test.name}`);
  } catch (error) {
    console.error(`❌ ${test.name}`);
    console.error(error);
    throw error;
  }
}
console.log(`\nResult: ${passed}/${tests.length} passed.`);
