export class SaveSessionNotesCommand {
  constructor(
    public readonly sessionId: string,
    public readonly content: string,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
