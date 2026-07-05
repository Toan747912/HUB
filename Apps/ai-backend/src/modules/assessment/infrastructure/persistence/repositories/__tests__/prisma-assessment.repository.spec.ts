import { PrismaService } from '../../../../../../infrastructure/persistence/prisma.service';
import { Assessment } from '../../../../domain/aggregates/assessment.aggregate';
import { AssessmentEngine } from '../../../../domain/engine/assessment.engine';
import { AssessmentInput } from '../../../../domain/engine/assessment-engine.types';
import { PrismaAssessmentRepository } from '../prisma-assessment.repository';
import {
  AssessmentId,
  GoalId,
  LearnerId,
  RoadmapId,
} from '../../../../../../shared/domain/identifiers';

const engine = new AssessmentEngine();
const context = { traceId: 't', correlationId: 'c', causationId: 'ca' };

const baseInput: AssessmentInput = {
  goalId: 'goal-1',
  roadmapId: 'roadmap-1',
  learnerId: 'learner-1',
  roadmapCompletionRatio: 80,
  tasks: [
    {
      id: 't1',
      skillId: 'Solid',
      completed: true,
      estimatedDurationDays: 2,
      actualDurationDays: 2,
    },
  ],
  revisionCount: 0,
  previousRuns: [],
};

const makeAssessment = (
  overrides: Partial<{ assessmentId: string; learnerId: string }> = {},
): Assessment =>
  Assessment.create(
    {
      assessmentId: AssessmentId.create(overrides.assessmentId ?? 'assessment-1'),
      goalId: GoalId.create('goal-1'),
      roadmapId: RoadmapId.create('roadmap-1'),
      learnerId: LearnerId.create(overrides.learnerId ?? 'learner-1'),
    },
    context,
  );

describe('PrismaAssessmentRepository — integration', () => {
  let prisma: PrismaService;
  let repository: PrismaAssessmentRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaAssessmentRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.assessment.deleteMany({});
  });

  it('saves a new assessment (DRAFT, no result yet) and returns it on findById', async () => {
    const assessment = makeAssessment({ assessmentId: 'assessment-t01' });
    await repository.save(assessment);

    const found = await repository.findById('assessment-t01');
    expect(found).not.toBeNull();
    expect(found!.getStatus()).toBe('DRAFT');
    expect(found!.getLatestResult()).toBeNull();
  });

  it('findById returns null for a non-existent assessmentId', async () => {
    const result = await repository.findById('does-not-exist');
    expect(result).toBeNull();
  });

  it('persists a run result and status transition, survives reload', async () => {
    const assessment = makeAssessment({ assessmentId: 'assessment-t03' });
    await repository.save(assessment);

    const computation = engine.evaluate(baseInput);
    assessment.run(computation, context, assessment.getAggregateVersion());
    await repository.save(assessment);

    const found = await repository.findById('assessment-t03');
    expect(found!.getStatus()).toBe('COMPLETED');
    expect(found!.getLatestResult()!.confidenceScore).toBe(computation.confidenceScore);
    expect(found!.getLatestResult()!.competencies).toHaveLength(computation.competencies.length);
  });

  it('deletes an assessment and subsequent findById returns null', async () => {
    const assessment = makeAssessment({ assessmentId: 'assessment-t04' });
    await repository.save(assessment);
    await repository.delete('assessment-t04');

    const found = await repository.findById('assessment-t04');
    expect(found).toBeNull();
  });

  it('preserves append-only history (versioning) across save/reload', async () => {
    const assessment = makeAssessment({ assessmentId: 'assessment-t05' });
    assessment.run(engine.evaluate(baseInput), context, assessment.getAggregateVersion());
    assessment.run(
      engine.evaluate({ ...baseInput, roadmapCompletionRatio: 40 }),
      context,
      assessment.getAggregateVersion(),
    );
    await repository.save(assessment);

    const found = await repository.findById('assessment-t05');
    expect(found!.getHistory()).toHaveLength(3);
    expect(found!.getHistory().map((h) => h.reason)).toEqual(['CREATED', 'RUN', 'RUN']);
  });

  it('findAll filters by learnerId', async () => {
    await repository.save(makeAssessment({ assessmentId: 'assessment-a', learnerId: 'learner-a' }));
    await repository.save(makeAssessment({ assessmentId: 'assessment-b', learnerId: 'learner-b' }));

    const forLearnerA = await repository.findAll('learner-a');
    expect(forLearnerA).toHaveLength(1);
    expect(forLearnerA[0].getId().toString()).toBe('assessment-a');

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
  });

  it('rejects a stale expectedVersion after reload (optimistic concurrency across persistence)', async () => {
    const assessment = makeAssessment({ assessmentId: 'assessment-t07' });
    await repository.save(assessment);

    const found = await repository.findById('assessment-t07');
    expect(() => found!.run(engine.evaluate(baseInput), context, 999)).toThrow();
  });

  it('throws when the underlying Prisma client throws (connection failure handling)', async () => {
    const faultyPrisma = {
      assessment: {
        upsert: () => Promise.reject(new Error('DB_FAULT')),
        findUnique: () => Promise.reject(new Error('DB_FAULT')),
        findMany: () => Promise.reject(new Error('DB_FAULT')),
        deleteMany: () => Promise.reject(new Error('DB_FAULT')),
      },
    } as unknown as PrismaService;

    const faultyRepo = new PrismaAssessmentRepository(faultyPrisma);
    const assessment = makeAssessment({ assessmentId: 'fault-assessment' });

    await expect(faultyRepo.save(assessment)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findById('x')).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findAll()).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.delete('x')).rejects.toThrow('DB_FAULT');
  });
});
