import { SkillId, TaskId } from '../../../../shared/domain/identifiers';

export class RoadmapTask {
  constructor(
    public readonly id: TaskId,
    public readonly title: string,
    public readonly order: number,
    public readonly dependsOn: TaskId[],
    public readonly estimatedDurationDays: number,
    public readonly complexity: string,
    public readonly skillId: SkillId,
    public readonly completed: boolean = false,
    public readonly completedAt?: Date,
  ) {}

  markCompleted(): RoadmapTask {
    return new RoadmapTask(
      this.id,
      this.title,
      this.order,
      this.dependsOn,
      this.estimatedDurationDays,
      this.complexity,
      this.skillId,
      true,
      new Date(),
    );
  }
}
