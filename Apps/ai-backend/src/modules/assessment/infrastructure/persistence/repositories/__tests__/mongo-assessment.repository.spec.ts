import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Model, disconnect } from 'mongoose';
import { Assessment } from '../../../../domain/aggregates/assessment.aggregate';
import { AssessmentEngine } from '../../../../domain/engine/assessment.engine';
import { AssessmentInput } from '../../../../domain/engine/assessment-engine.types';
import { AssessmentDocument } from '../../documents/assessment.document';
import { AssessmentSchema } from '../../schemas/assessment.schema';
import { MongoAssessmentRepository } from '../mongo-assessment.repository';
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

// First run: MongoMemoryServer downloads the MongoDB binary (~780 MB).
jest.setTimeout(300_000);

describe('MongoAssessmentRepository — integration', () => {
  let mongod: MongoMemoryReplSet;
  let module: TestingModule;
  let repository: MongoAssessmentRepository;
  let model: Model<AssessmentDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'test-db' }),
        MongooseModule.forFeature([{ name: 'Assessment', schema: AssessmentSchema }]),
      ],
      providers: [
        {
          provide: MongoAssessmentRepository,
          useFactory: (m: Model<AssessmentDocument>) => new MongoAssessmentRepository(m),
          inject: [getModelToken('Assessment')],
        },
      ],
    }).compile();

    repository = module.get(MongoAssessmentRepository);
    model = module.get<Model<AssessmentDocument>>(getModelToken('Assessment'));
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await model.deleteMany({});
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

  it('throws when the underlying Mongoose model throws (connection failure handling)', async () => {
    const faultyModel = {
      findByIdAndUpdate: () => Promise.reject(new Error('DB_FAULT')),
      findById: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('DB_FAULT')) }) }),
      find: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('DB_FAULT')) }) }),
      findByIdAndDelete: () => ({ exec: () => Promise.reject(new Error('DB_FAULT')) }),
    } as any;

    const faultyRepo = new MongoAssessmentRepository(faultyModel);
    const assessment = makeAssessment({ assessmentId: 'fault-assessment' });

    await expect(faultyRepo.save(assessment)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findById('x')).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findAll()).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.delete('x')).rejects.toThrow('DB_FAULT');
  });
});
