export class SessionProgress {
  constructor(
    public readonly completedTasksCount: number,
    public readonly totalTasksCount: number,
    public readonly completionRate: number = 0,
    public readonly lastUpdatedAt: Date = new Date(),
  ) {}

  update(completed: number, total: number): SessionProgress {
    const rate = total === 0 ? 0 : Number((completed / total).toFixed(4));
    return new SessionProgress(completed, total, rate, new Date());
  }
}
