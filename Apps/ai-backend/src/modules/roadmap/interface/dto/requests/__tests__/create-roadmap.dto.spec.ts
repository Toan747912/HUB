import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'crypto';
import { CreateRoadmapDto } from '../create-roadmap.dto';

const validPayload = () => ({
  roadmapId: randomUUID(),
  goalId: randomUUID(),
  learnerId: randomUUID(),
  title: 'Master TypeScript',
  description: 'Deep TS knowledge',
  goalType: 'SKILL',
  difficulty: 'INTERMEDIATE',
  priority: 'HIGH',
  constraints: ['5 hours/week'],
  targetDate: '2027-01-01'
});

describe('CreateRoadmapDto validation', () => {
  it('accepts a fully valid payload', async () => {
    const dto = plainToInstance(CreateRoadmapDto, validPayload());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a non-UUID roadmapId', async () => {
    const dto = plainToInstance(CreateRoadmapDto, { ...validPayload(), roadmapId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'roadmapId')).toBe(true);
  });

  it('rejects a missing title', async () => {
    const payload = validPayload() as any;
    delete payload.title;
    const dto = plainToInstance(CreateRoadmapDto, payload);
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'title')).toBe(true);
  });

  it('rejects a non-array constraints field', async () => {
    const dto = plainToInstance(CreateRoadmapDto, { ...validPayload(), constraints: 'not-an-array' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'constraints')).toBe(true);
  });

  it('rejects an invalid targetDate', async () => {
    const dto = plainToInstance(CreateRoadmapDto, { ...validPayload(), targetDate: 'not-a-date' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'targetDate')).toBe(true);
  });
});
