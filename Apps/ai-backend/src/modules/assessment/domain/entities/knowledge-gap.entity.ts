import { SkillId } from '../../../../shared/domain/identifiers';

export class KnowledgeGap {
  constructor(
    public readonly id: string,
    public readonly skillId: SkillId,
    public readonly weight: string,
    public readonly reason: string,
  ) {}
}
