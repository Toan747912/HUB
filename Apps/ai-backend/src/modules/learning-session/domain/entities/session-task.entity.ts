import { SkillId } from '../../../../shared/domain/identifiers';

export class SessionTask {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly completed: boolean = false,
    public readonly completedAt: Date | null = null,
    public readonly skillId: SkillId,
  ) {}

  complete(): SessionTask {
    return new SessionTask(this.id, this.title, true, new Date(), this.skillId);
  }

  uncomplete(): SessionTask {
    return new SessionTask(this.id, this.title, false, null, this.skillId);
  }
}
