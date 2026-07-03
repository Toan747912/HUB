import { SkillId } from '../../../../shared/domain/identifiers';

export class Competency {
  constructor(
    public readonly skillId: SkillId,
    public readonly score: number,
    public readonly level: string,
  ) {}
}
