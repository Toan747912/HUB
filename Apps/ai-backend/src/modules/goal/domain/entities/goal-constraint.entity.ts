export class GoalConstraint {
  constructor(
    public readonly id: string,
    public readonly type: string,
    public readonly value: string,
    public readonly active: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) {}

  deactivate(): GoalConstraint {
    return new GoalConstraint(this.id, this.type, this.value, false, this.createdAt);
  }
}
