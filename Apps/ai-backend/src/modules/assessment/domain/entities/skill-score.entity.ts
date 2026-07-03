import { SkillId } from '../../../../shared/domain/identifiers';

export class SkillScore {
  constructor(
    public readonly skillId: SkillId,
    public readonly rawScore: number,
    public readonly taskCount: number,
    public readonly completedTaskCount: number,
  ) {}
}
