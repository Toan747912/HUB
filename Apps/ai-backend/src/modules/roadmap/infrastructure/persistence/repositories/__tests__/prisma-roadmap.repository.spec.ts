import { PrismaService } from '../../../../../../infrastructure/persistence/prisma.service';
import { Roadmap } from '../../../../domain/aggregates/roadmap.aggregate';
import { RoadmapPlanningEngine } from '../../../../domain/engine/roadmap-planning.engine';
import { PlanningInput } from '../../../../domain/engine/roadmap-planning.types';
import { resolveTestPlan } from '../../../../domain/engine/__tests__/resolve-test-plan';
import { PrismaRoadmapRepository } from '../prisma-roadmap.repository';
import { GoalId, LearnerId, RoadmapId } from '../../../../../../shared/domain/identifiers';

const engine = new RoadmapPlanningEngine();

const goalSnapshot: PlanningInput = {
  goalId: 'goal-1',
  learnerId: 'learner-1',
  title: 'Master TypeScript',
  description: 'Deep TS knowledge',
  goalType: 'SKILL',
  difficulty: 'INTERMEDIATE',
  priority: 'HIGH',
  constraints: ['5 hours/week'],
  targetDate: '2027-01-01',
};

const makeRoadmap = (
  overrides: Partial<{ roadmapId: string; learnerId: string }> = {},
): Roadmap => {
  const snapshot = { ...goalSnapshot, learnerId: overrides.learnerId ?? goalSnapshot.learnerId };
  const plan = resolveTestPlan(engine.generate(snapshot));
  return Roadmap.create(
    {
      roadmapId: RoadmapId.create(overrides.roadmapId ?? 'roadmap-1'),
      goalId: GoalId.create(snapshot.goalId),
      learnerId: LearnerId.create(snapshot.learnerId),
      goalSnapshot: snapshot,
      plan,
    },
    { traceId: 't', correlationId: 'c', causationId: 'ca' },
  );
};

describe('PrismaRoadmapRepository — integration', () => {
  let prisma: PrismaService;
  let repository: PrismaRoadmapRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaRoadmapRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.roadmap.deleteMany({});
  });

  it('saves a new roadmap and returns it on findById', async () => {
    const roadmap = makeRoadmap({ roadmapId: 'roadmap-t01' });
    await repository.save(roadmap);

    const found = await repository.findById('roadmap-t01');

    expect(found).not.toBeNull();
    expect(found!.getId().toString()).toBe('roadmap-t01');
    expect(found!.getStatus()).toBe('DRAFT');
    expect(found!.getPhases().length).toBe(roadmap.getPhases().length);
  });

  it('findById returns null for a non-existent roadmapId', async () => {
    const result = await repository.findById('does-not-exist');
    expect(result).toBeNull();
  });

  it('persists status transitions and version bumps', async () => {
    const roadmap = makeRoadmap({ roadmapId: 'roadmap-t03' });
    await repository.save(roadmap);

    roadmap.publish(
      { traceId: 't', correlationId: 'c', causationId: 'ca' },
      roadmap.getAggregateVersion(),
    );
    await repository.save(roadmap);

    const found = await repository.findById('roadmap-t03');
    expect(found!.getStatus()).toBe('PUBLISHED');
    expect(found!.getAggregateVersion()).toBe(roadmap.getAggregateVersion());
  });

  it('deletes a roadmap and subsequent findById returns null', async () => {
    const roadmap = makeRoadmap({ roadmapId: 'roadmap-t04' });
    await repository.save(roadmap);

    await repository.delete('roadmap-t04');

    const found = await repository.findById('roadmap-t04');
    expect(found).toBeNull();
  });

  it('preserves append-only revision history (versioning) across save/reload', async () => {
    const roadmap = makeRoadmap({ roadmapId: 'roadmap-t05' });
    const regenerated = resolveTestPlan(engine.generate({ ...goalSnapshot, difficulty: 'EXPERT' }));
    roadmap.regenerate(
      regenerated,
      { traceId: 't', correlationId: 'c', causationId: 'ca' },
      roadmap.getAggregateVersion(),
    );
    await repository.save(roadmap);

    const found = await repository.findById('roadmap-t05');
    expect(found!.getRevisions()).toHaveLength(2);
    expect(found!.getRevisions().map((r) => r.reason)).toEqual(['CREATED', 'REGENERATED']);
  });

  it('findAll filters by learnerId', async () => {
    await repository.save(makeRoadmap({ roadmapId: 'roadmap-a', learnerId: 'learner-a' }));
    await repository.save(makeRoadmap({ roadmapId: 'roadmap-b', learnerId: 'learner-b' }));

    const forLearnerA = await repository.findAll('learner-a');
    expect(forLearnerA).toHaveLength(1);
    expect(forLearnerA[0].getId().toString()).toBe('roadmap-a');

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
  });

  it('rejects a stale expectedVersion after reload (optimistic concurrency across persistence)', async () => {
    const roadmap = makeRoadmap({ roadmapId: 'roadmap-t07' });
    await repository.save(roadmap);

    const found = await repository.findById('roadmap-t07');
    expect(() =>
      found!.publish({ traceId: 't', correlationId: 'c', causationId: 'ca' }, 999),
    ).toThrow();
  });

  it('throws when the underlying Prisma client throws (connection failure handling)', async () => {
    const faultyPrisma = {
      roadmap: {
        upsert: () => Promise.reject(new Error('DB_FAULT')),
        findUnique: () => Promise.reject(new Error('DB_FAULT')),
        findMany: () => Promise.reject(new Error('DB_FAULT')),
        deleteMany: () => Promise.reject(new Error('DB_FAULT')),
      },
    } as unknown as PrismaService;

    const faultyRepo = new PrismaRoadmapRepository(faultyPrisma);
    const roadmap = makeRoadmap({ roadmapId: 'fault-roadmap' });

    await expect(faultyRepo.save(roadmap)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findById('x')).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findAll()).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.delete('x')).rejects.toThrow('DB_FAULT');
  });
});
