import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Model, disconnect } from 'mongoose';
import { randomUUID } from 'crypto';
import { Goal } from '../../../../domain/aggregates/goal.aggregate';
import { GoalDifficulty } from '../../../../domain/value-objects/goal-difficulty.vo';
import { Priority } from '../../../../../../shared/domain/vocabulary/priority.vo';
import { GoalType } from '../../../../domain/value-objects/goal-type.vo';
import { TargetDate } from '../../../../domain/value-objects/target-date.vo';
import { GoalMilestone } from '../../../../domain/entities/goal-milestone.entity';
import { GoalDocument } from '../../documents/goal.document';
import { GoalSchema } from '../../schemas/goal.schema';
import { MongoGoalRepository } from '../mongo-goal.repository';
import { GoalId, LearnerId, MilestoneId } from '../../../../../../shared/domain/identifiers';

const makeGoal = (overrides: Partial<{ goalId: string; learnerId: string }> = {}): Goal =>
  Goal.create(
    {
      goalId: GoalId.create(overrides.goalId ?? randomUUID()),
      learnerId: LearnerId.create(overrides.learnerId ?? 'learner-1'),
      title: 'Master TypeScript',
      description: 'Deep TS knowledge',
      type: GoalType.create('SKILL'),
      difficulty: GoalDifficulty.create('INTERMEDIATE'),
      priority: Priority.create('HIGH'),
      targetDate: TargetDate.create('2027-01-01'),
    },
    { traceId: 'test-trace', correlationId: 'test-corr', causationId: 'test-cause' },
  );

// First run: MongoMemoryServer downloads the MongoDB binary (~780 MB).
// Subsequent runs use the cached binary and start in <5 seconds.
jest.setTimeout(300_000);

describe('MongoGoalRepository — integration', () => {
  let mongod: MongoMemoryReplSet;
  let module: TestingModule;
  let repository: MongoGoalRepository;
  let model: Model<GoalDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'test-db' }),
        MongooseModule.forFeature([{ name: 'Goal', schema: GoalSchema }]),
      ],
      providers: [
        {
          provide: MongoGoalRepository,
          useFactory: (m: Model<GoalDocument>) => new MongoGoalRepository(m),
          inject: [getModelToken('Goal')],
        },
      ],
    }).compile();

    repository = module.get(MongoGoalRepository);
    model = module.get<Model<GoalDocument>>(getModelToken('Goal'));
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await model.deleteMany({});
  });

  // Test 1 — Create Goal
  it('T01: saves a new goal and returns it on findById', async () => {
    const goal = makeGoal({ goalId: 'goal-t01' });
    await repository.save(goal);

    const found = await repository.findById('goal-t01');

    expect(found).not.toBeNull();
    expect(found!.getId().toString()).toBe('goal-t01');
    expect(found!.getStatus()).toBe('DRAFT');
    expect(found!.getAggregateVersion()).toBe(1);
  });

  // Test 2 — Read Goal
  it('T02: findById returns null for non-existent goalId', async () => {
    const result = await repository.findById('does-not-exist');
    expect(result).toBeNull();
  });

  // Test 3 — Update Goal
  it('T03: saves updated goal state (status transition)', async () => {
    const goal = makeGoal({ goalId: 'goal-t03' });
    await repository.save(goal);

    goal.transitionTo('ACTIVE', { traceId: 't', correlationId: 'c', causationId: 'ca' });
    await repository.save(goal);

    const found = await repository.findById('goal-t03');
    expect(found!.getStatus()).toBe('ACTIVE');
    expect(found!.getAggregateVersion()).toBe(2);
  });

  // Test 4 — Delete Goal
  it('T04: deletes a goal and subsequent findById returns null', async () => {
    const goal = makeGoal({ goalId: 'goal-t04' });
    await repository.save(goal);

    await repository.delete('goal-t04');

    const found = await repository.findById('goal-t04');
    expect(found).toBeNull();
  });

  // Test 5 — Version preservation
  it('T05: aggregateVersion persisted and restored exactly', async () => {
    const goal = makeGoal({ goalId: 'goal-t05' });
    // version starts at 1 after create
    expect(goal.getAggregateVersion()).toBe(1);

    goal.transitionTo('ACTIVE', { traceId: 't', correlationId: 'c', causationId: 'ca' });
    // version is 2 after transition
    expect(goal.getAggregateVersion()).toBe(2);

    await repository.save(goal);
    const found = await repository.findById('goal-t05');
    expect(found!.getAggregateVersion()).toBe(2);

    // Verify optimistic locking still works after reload
    expect(() =>
      found!.transitionTo(
        'IN_PROGRESS',
        { traceId: 't', correlationId: 'c', causationId: 'ca' },
        999,
      ),
    ).toThrow();
  });

  // Test 6 — Persistence restart survival (save → reload → verify full state)
  it('T06: full aggregate state survives save and reload cycle', async () => {
    const goalId = 'goal-t06';
    const goal = makeGoal({ goalId, learnerId: 'learner-99' });

    const milestone = new GoalMilestone(MilestoneId.create(randomUUID()), 'Complete module 1');
    goal.addMilestone(milestone, goal.getAggregateVersion());

    goal.transitionTo(
      'ACTIVE',
      { traceId: 't', correlationId: 'c', causationId: 'ca' },
      goal.getAggregateVersion(),
    );

    await repository.save(goal);

    const loaded = await repository.findById(goalId);

    expect(loaded).not.toBeNull();
    expect(loaded!.getId().toString()).toBe(goalId);
    expect((loaded as any).learnerId.toString()).toBe('learner-99');
    expect(loaded!.getStatus()).toBe('ACTIVE');
    expect(loaded!.getMilestones()).toHaveLength(1);
    expect(loaded!.getMilestones()[0].title).toBe('Complete module 1');
    expect(loaded!.getMilestones()[0].reached).toBe(false);
    expect(loaded!.getVersions()).toHaveLength(1);
  });

  // Test 7 — Missing Goal (findById returns null)
  it('T07: findAll returns empty array when collection is empty', async () => {
    const all = await repository.findAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(0);
  });

  it('T07b: findAll returns all saved goals', async () => {
    await repository.save(makeGoal({ goalId: 'goal-a' }));
    await repository.save(makeGoal({ goalId: 'goal-b' }));
    await repository.save(makeGoal({ goalId: 'goal-c' }));

    const all = await repository.findAll();
    expect(all).toHaveLength(3);
    const ids = all.map((g) => g.getId().toString()).sort();
    expect(ids).toEqual(['goal-a', 'goal-b', 'goal-c']);
  });

  // Test 8 — Connection failure handling
  it('T08: repository methods throw when Mongoose model throws', async () => {
    const faultyModel = {
      findByIdAndUpdate: () => Promise.reject(new Error('DB_FAULT')),
      findById: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('DB_FAULT')) }) }),
      find: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('DB_FAULT')) }) }),
      findByIdAndDelete: () => ({ exec: () => Promise.reject(new Error('DB_FAULT')) }),
    } as any;

    const faultyRepo = new MongoGoalRepository(faultyModel);
    const goal = makeGoal({ goalId: 'fault-goal' });

    await expect(faultyRepo.save(goal)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findById('x')).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findAll()).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.delete('x')).rejects.toThrow('DB_FAULT');
  });
});
