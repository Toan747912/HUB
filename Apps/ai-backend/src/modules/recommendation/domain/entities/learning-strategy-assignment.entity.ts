import { SkillId } from '../../../../shared/domain/identifiers';

export class LearningStrategyAssignment {
  constructor(
    public readonly skillId: SkillId,
    public readonly strategy: string,
    public readonly rationale: string
  ) {}
}
