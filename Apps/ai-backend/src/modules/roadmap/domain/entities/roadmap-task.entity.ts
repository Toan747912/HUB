export class RoadmapTask {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly order: number,
    public readonly dependsOn: string[],
    public readonly estimatedDurationDays: number,
    public readonly complexity: string,
    public readonly completed: boolean = false,
    public readonly completedAt?: Date
  ) {}

  markCompleted(): RoadmapTask {
    return new RoadmapTask(
      this.id,
      this.title,
      this.order,
      this.dependsOn,
      this.estimatedDurationDays,
      this.complexity,
      true,
      new Date()
    );
  }
}
