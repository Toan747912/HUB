export class GoalMilestone {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly reached: boolean = false,
    public readonly reachedAt?: Date
  ) {}

  markReached(): GoalMilestone {
    return new GoalMilestone(this.id, this.title, true, new Date());
  }
}
