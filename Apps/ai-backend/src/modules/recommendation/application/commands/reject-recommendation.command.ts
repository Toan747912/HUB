export class RejectRecommendationCommand {
  constructor(
    public readonly recommendationId: string,
    public readonly reason: string | undefined,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
