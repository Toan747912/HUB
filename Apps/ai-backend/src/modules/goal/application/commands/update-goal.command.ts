export class UpdateGoalCommand {
  constructor(
    public readonly goalId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly type: string,
    public readonly difficulty: string,
    public readonly priority: string,
    public readonly targetDate: string,
    public readonly expectedVersion: number,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
