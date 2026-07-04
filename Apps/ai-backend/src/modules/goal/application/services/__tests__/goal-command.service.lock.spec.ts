import { GoalId, LearnerId } from '../../../../../shared/domain/identifiers';
import { Goal } from '../../../domain/aggregates/goal.aggregate';
import { GoalDifficulty } from '../../../domain/value-objects/goal-difficulty.vo';
import { Priority } from '../../../../../shared/domain/vocabulary/priority.vo';
import { GoalType } from '../../../domain/value-objects/goal-type.vo';
import { TargetDate } from '../../../domain/value-objects/target-date.vo';
import { IGoalRepository } from '../../contracts/goal-repository.contract';
import { IEventPublisher } from '../../contracts/event-publisher.contract';
import { CompleteGoalCommand } from '../../commands/complete-goal.command';
import { GoalCommandService, IGoalLock } from '../goal-command.service';

const makeGoal = (): Goal => {
  const goal = Goal.create(
    {
      goalId: GoalId.create('goal-lock-1'),
      learnerId: LearnerId.create('learner-1'),
      title: 'Master TypeScript',
      description: 'Deep TS knowledge',
      type: GoalType.create('SKILL'),
      difficulty: GoalDifficulty.create('INTERMEDIATE'),
      priority: Priority.create('HIGH'),
      targetDate: TargetDate.create('2027-01-01'),
    },
    { traceId: 't', correlationId: 'c', causationId: 'ca' },
  );
  // completeGoal requires IN_PROGRESS -> COMPLETED; walk the lifecycle forward.
  goal.transitionTo('ACTIVE', { traceId: 't', correlationId: 'c', causationId: 'ca' });
  goal.transitionTo('IN_PROGRESS', { traceId: 't', correlationId: 'c', causationId: 'ca' });
  return goal;
};

const makeConnection = (): any => ({
  startSession: jest.fn().mockResolvedValue({
    withTransaction: async (fn: () => Promise<void>) => {
      await fn();
    },
    endSession: jest.fn().mockResolvedValue(undefined),
  }),
});

describe('GoalCommandService — distributed lock wiring', () => {
  let repository: jest.Mocked<IGoalRepository>;
  let eventPublisher: jest.Mocked<IEventPublisher>;
  let connection: any;
  let goalLock: jest.Mocked<IGoalLock>;
  let service: GoalCommandService;

  beforeEach(() => {
    repository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    } as any;
    eventPublisher = {
      publish: jest.fn(),
      publishMany: jest.fn().mockResolvedValue(undefined),
      stage: jest.fn().mockResolvedValue(undefined),
    };
    connection = makeConnection();
    goalLock = {
      lock: jest.fn().mockResolvedValue({ token: 'tok' }),
      unlock: jest.fn().mockResolvedValue(undefined),
    };
    service = new GoalCommandService(repository, eventPublisher, connection, goalLock);
  });

  it('acquires and releases the lock around completeGoal', async () => {
    const goal = makeGoal();
    repository.findById.mockResolvedValue(goal);

    const command = new CompleteGoalCommand(
      'goal-lock-1',
      goal.getAggregateVersion(),
      't',
      'c',
      'ca',
    );

    await service.completeGoal(command);

    expect(goalLock.lock).toHaveBeenCalledWith('goal-lock-1');
    expect(goalLock.unlock).toHaveBeenCalledWith({ token: 'tok' });
  });

  it('releases the lock even when the command fails (goal not found)', async () => {
    repository.findById.mockResolvedValue(null);

    const command = new CompleteGoalCommand('missing-goal', 1, 't', 'c', 'ca');

    await expect(service.completeGoal(command)).rejects.toThrow();

    expect(goalLock.lock).toHaveBeenCalledWith('missing-goal');
    expect(goalLock.unlock).toHaveBeenCalledWith({ token: 'tok' });
  });

  it('works without a lock service (backward compatible, lock is optional)', async () => {
    const goal = makeGoal();
    repository.findById.mockResolvedValue(goal);
    const noLockService = new GoalCommandService(repository, eventPublisher, connection);

    const command = new CompleteGoalCommand(
      'goal-lock-1',
      goal.getAggregateVersion(),
      't',
      'c',
      'ca',
    );

    await expect(noLockService.completeGoal(command)).resolves.toBeDefined();
  });
});
