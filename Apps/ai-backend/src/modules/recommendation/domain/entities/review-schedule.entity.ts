import { SkillId } from '../../../../shared/domain/identifiers';

export class ReviewSchedule {
  constructor(
    public readonly skillId: SkillId,
    public readonly intervalDays: number,
    public readonly dueDate: string,
    public readonly reason: string
  ) {}
}
