import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { GenerateRecommendationsDto } from '../generate-recommendations.dto';

const validPayload = () => ({
  recommendationId: randomUUID(),
  goalId: randomUUID(),
  roadmapId: randomUUID(),
  assessmentId: randomUUID(),
  learnerId: randomUUID(),
  goalPriority: 'MEDIUM',
  goalDifficulty: 'INTERMEDIATE',
  targetDate: '2027-06-01T00:00:00.000Z',
  referenceDate: '2027-01-01T00:00:00.000Z',
  roadmapCompletionRatio: 60,
  revisionCount: 0,
  tasks: [{ id: 't1', skillArea: 'Foundations', completed: false, order: 1, dependsOn: [], estimatedDurationDays: 3 }],
  competencies: [{ skillArea: 'Foundations', score: 60, level: 'PROFICIENT' }],
  knowledgeGaps: [],
  confidenceScore: 70,
  readiness: 'NOT_READY'
});

describe('GenerateRecommendationsDto validation', () => {
  it('accepts a fully valid payload', async () => {
    const dto = plainToInstance(GenerateRecommendationsDto, validPayload());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID recommendationId', async () => {
    const dto = plainToInstance(GenerateRecommendationsDto, { ...validPayload(), recommendationId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'recommendationId')).toBe(true);
  });

  it('rejects roadmapCompletionRatio outside [0, 100]', async () => {
    const dto = plainToInstance(GenerateRecommendationsDto, { ...validPayload(), roadmapCompletionRatio: 200 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'roadmapCompletionRatio')).toBe(true);
  });

  it('rejects an empty tasks array', async () => {
    const dto = plainToInstance(GenerateRecommendationsDto, { ...validPayload(), tasks: [] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tasks')).toBe(true);
  });

  it('rejects a malformed nested competency (score out of bounds)', async () => {
    const dto = plainToInstance(GenerateRecommendationsDto, {
      ...validPayload(),
      competencies: [{ skillArea: 'Foundations', score: 150, level: 'PROFICIENT' }]
    });
    const errors = await validate(dto);
    const competencyErrors = errors.find((e) => e.property === 'competencies');
    expect(competencyErrors).toBeDefined();
  });

  it('rejects an invalid targetDate', async () => {
    const dto = plainToInstance(GenerateRecommendationsDto, { ...validPayload(), targetDate: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'targetDate')).toBe(true);
  });

  it('rejects a negative revisionCount', async () => {
    const dto = plainToInstance(GenerateRecommendationsDto, { ...validPayload(), revisionCount: -1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'revisionCount')).toBe(true);
  });
});
