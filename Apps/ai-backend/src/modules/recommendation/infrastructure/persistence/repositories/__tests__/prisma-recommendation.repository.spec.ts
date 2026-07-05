import { PrismaService } from '../../../../../../infrastructure/persistence/prisma.service';
import { Recommendation } from '../../../../domain/aggregates/recommendation.aggregate';
import { RecommendationEngine } from '../../../../domain/engine/recommendation.engine';
import { RecommendationInput } from '../../../../domain/engine/recommendation-engine.types';
import { PrismaRecommendationRepository } from '../prisma-recommendation.repository';
import {
  AssessmentId,
  GoalId,
  LearnerId,
  RecommendationId,
  RoadmapId,
} from '../../../../../../shared/domain/identifiers';

const engine = new RecommendationEngine();
const context = { traceId: 't', correlationId: 'c', causationId: 'ca' };

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
      completed: false,
      order: 1,
      dependsOn: [],
      estimatedDurationDays: 3,
    },
  ],
  competencies: [{ skillId: 'Foundations', score: 60, level: 'PROFICIENT' }],
  knowledgeGaps: [],
  confidenceScore: 70,
  readiness: 'NOT_READY',
};

const makeRecommendation = (
  overrides: Partial<{ recommendationId: string; learnerId: string }> = {},
): Recommendation => {
  const computation = engine.evaluate(baseInput);
  return Recommendation.create(
    {
      recommendationId: RecommendationId.create(overrides.recommendationId ?? 'rec-1'),
      goalId: GoalId.create('goal-1'),
      roadmapId: RoadmapId.create('roadmap-1'),
      assessmentId: AssessmentId.create('assessment-1'),
      learnerId: LearnerId.create(overrides.learnerId ?? 'learner-1'),
      computation,
    },
    context,
  );
};

describe('PrismaRecommendationRepository — integration', () => {
  let prisma: PrismaService;
  let repository: PrismaRecommendationRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaRecommendationRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.recommendation.deleteMany({});
  });

  it('saves a new recommendation and returns it on findById', async () => {
    const recommendation = makeRecommendation({ recommendationId: 'rec-t01' });
    await repository.save(recommendation);

    const found = await repository.findById('rec-t01');
    expect(found).not.toBeNull();
    expect(found!.getStatus()).toBe('GENERATED');
    expect(found!.getItems().length).toBe(recommendation.getItems().length);
    expect(found!.getPriorityDecisions().length).toBe(recommendation.getPriorityDecisions().length);
  });

  it('findById returns null for a non-existent recommendationId', async () => {
    const result = await repository.findById('does-not-exist');
    expect(result).toBeNull();
  });

  it('persists status transitions, survives reload', async () => {
    const recommendation = makeRecommendation({ recommendationId: 'rec-t03' });
    await repository.save(recommendation);

    recommendation.approve(context, recommendation.getAggregateVersion());
    await repository.save(recommendation);

    const found = await repository.findById('rec-t03');
    expect(found!.getStatus()).toBe('APPROVED');
    expect(found!.getAggregateVersion()).toBe(recommendation.getAggregateVersion());
  });

  it('deletes a recommendation and subsequent findById returns null', async () => {
    const recommendation = makeRecommendation({ recommendationId: 'rec-t04' });
    await repository.save(recommendation);
    await repository.delete('rec-t04');

    const found = await repository.findById('rec-t04');
    expect(found).toBeNull();
  });

  it('preserves append-only history (versioning) across save/reload', async () => {
    const recommendation = makeRecommendation({ recommendationId: 'rec-t05' });
    recommendation.approve(context, recommendation.getAggregateVersion());
    recommendation.archive(context, recommendation.getAggregateVersion());
    await repository.save(recommendation);

    const found = await repository.findById('rec-t05');
    expect(found!.getHistory().map((h) => h.reason)).toEqual(['GENERATED', 'APPROVED', 'ARCHIVED']);
  });

  it('findAll filters by learnerId', async () => {
    await repository.save(
      makeRecommendation({ recommendationId: 'rec-a', learnerId: 'learner-a' }),
    );
    await repository.save(
      makeRecommendation({ recommendationId: 'rec-b', learnerId: 'learner-b' }),
    );

    const forLearnerA = await repository.findAll('learner-a');
    expect(forLearnerA).toHaveLength(1);
    expect(forLearnerA[0].getId().toString()).toBe('rec-a');

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
  });

  it('rejects a stale expectedVersion after reload (optimistic concurrency across persistence)', async () => {
    const recommendation = makeRecommendation({ recommendationId: 'rec-t07' });
    await repository.save(recommendation);

    const found = await repository.findById('rec-t07');
    expect(() => found!.approve(context, 999)).toThrow();
  });

  it('throws when the underlying Prisma client throws (connection failure handling)', async () => {
    const faultyPrisma = {
      recommendation: {
        upsert: () => Promise.reject(new Error('DB_FAULT')),
        findUnique: () => Promise.reject(new Error('DB_FAULT')),
        findMany: () => Promise.reject(new Error('DB_FAULT')),
        deleteMany: () => Promise.reject(new Error('DB_FAULT')),
      },
    } as unknown as PrismaService;

    const faultyRepo = new PrismaRecommendationRepository(faultyPrisma);
    const recommendation = makeRecommendation({ recommendationId: 'fault-rec' });

    await expect(faultyRepo.save(recommendation)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findById('x')).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findAll()).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.delete('x')).rejects.toThrow('DB_FAULT');
  });
});
