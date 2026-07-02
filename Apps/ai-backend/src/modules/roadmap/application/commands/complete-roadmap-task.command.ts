export class CompleteRoadmapTaskCommand {
  constructor(
    public readonly roadmapId: string,
    public readonly taskId: string,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string
  ) {}
}
