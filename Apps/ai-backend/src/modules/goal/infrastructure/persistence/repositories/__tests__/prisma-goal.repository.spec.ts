import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../../../infrastructure/persistence/prisma.service';
import { Goal } from '../../../../domain/aggregates/goal.aggregate';
import { GoalDifficulty } from '../../../../domain/value-objects/goal-difficulty.vo';
import { Priority } from '../../../../../../shared/domain/vocabulary/priority.vo';
import { GoalType } from '../../../../domain/value-objects/goal-type.vo';
import { TargetDate } from '../../../../domain/value-objects/target-date.vo';
import { GoalMilestone } from '../../../../domain/entities/goal-milestone.entity';
import { PrismaGoalRepository } from '../prisma-goal.repository';
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

describe('PrismaGoalRepository — integration', () => {
  let prisma: PrismaService;
  let repository: PrismaGoalRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaGoalRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.goal.deleteMany({});
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
  it('T07: findAll returns empty array when table is empty', async () => {
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
  it('T08: repository methods throw when the Prisma client throws', async () => {
    const faultyPrisma = {
      goal: {
        upsert: () => Promise.reject(new Error('DB_FAULT')),
        findUnique: () => Promise.reject(new Error('DB_FAULT')),
        findMany: () => Promise.reject(new Error('DB_FAULT')),
        deleteMany: () => Promise.reject(new Error('DB_FAULT')),
      },
    } as unknown as PrismaService;

    const faultyRepo = new PrismaGoalRepository(faultyPrisma);
    const goal = makeGoal({ goalId: 'fault-goal' });

    await expect(faultyRepo.save(goal)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findById('x')).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findAll()).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.delete('x')).rejects.toThrow('DB_FAULT');
  });
});
