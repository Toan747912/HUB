export class ArchiveGoalCommand {
  constructor(
    public readonly goalId: string,
    public readonly expectedVersion: number,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
