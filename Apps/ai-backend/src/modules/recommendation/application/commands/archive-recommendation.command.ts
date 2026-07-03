export class ArchiveRecommendationCommand {
  constructor(
    public readonly recommendationId: string,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
