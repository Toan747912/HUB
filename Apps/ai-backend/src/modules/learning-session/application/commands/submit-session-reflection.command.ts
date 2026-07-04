export class SubmitSessionReflectionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly content: string,
    public readonly rating: number,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
