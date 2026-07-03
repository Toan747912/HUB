import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { RunAssessmentDto } from '../run-assessment.dto';

const validPayload = () => ({
  assessmentId: randomUUID(),
  roadmapCompletionRatio: 75,
  tasks: [
    {
      id: 't1',
      skillId: 'Foundations',
      completed: true,
      estimatedDurationDays: 2,
      actualDurationDays: 2,
    },
  ],
  revisionCount: 0,
  previousRuns: [],
});

describe('RunAssessmentDto validation', () => {
  it('accepts a fully valid payload', async () => {
    const dto = plainToInstance(RunAssessmentDto, validPayload());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID assessmentId', async () => {
    const dto = plainToInstance(RunAssessmentDto, {
      ...validPayload(),
      assessmentId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'assessmentId')).toBe(true);
  });

  it('rejects roadmapCompletionRatio outside [0, 100]', async () => {
    const dto = plainToInstance(RunAssessmentDto, {
      ...validPayload(),
      roadmapCompletionRatio: 150,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'roadmapCompletionRatio')).toBe(true);
  });

  it('rejects an empty tasks array', async () => {
    const dto = plainToInstance(RunAssessmentDto, { ...validPayload(), tasks: [] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tasks')).toBe(true);
  });

  it('rejects a negative revisionCount', async () => {
    const dto = plainToInstance(RunAssessmentDto, { ...validPayload(), revisionCount: -1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'revisionCount')).toBe(true);
  });

  it('rejects a malformed nested task (missing skillId)', async () => {
    const payload = validPayload();
    delete (payload.tasks[0] as any).skillId;
    const dto = plainToInstance(RunAssessmentDto, payload);
    const errors = await validate(dto);
    const taskErrors = errors.find((e) => e.property === 'tasks');
    expect(taskErrors).toBeDefined();
  });
});
