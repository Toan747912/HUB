export class AddGoalMilestoneCommand {
  constructor(
    public readonly goalId: string,
    public readonly milestoneId: string,
    public readonly description: string,
    public readonly expectedVersion: number,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
