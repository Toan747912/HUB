export class UpdateRoadmapCommand {
  constructor(
    public readonly roadmapId: string,
    public readonly changes: Record<string, unknown>,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string
  ) {}
}
