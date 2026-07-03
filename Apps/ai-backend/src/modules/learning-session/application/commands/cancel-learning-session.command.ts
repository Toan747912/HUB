export class CancelLearningSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly reason: string | null = null,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
