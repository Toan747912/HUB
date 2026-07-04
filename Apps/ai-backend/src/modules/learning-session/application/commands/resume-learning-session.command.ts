export class ResumeLearningSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
