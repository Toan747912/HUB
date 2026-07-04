export class ToggleSessionTaskCommand {
  constructor(
    public readonly sessionId: string,
    public readonly taskId: string,
    public readonly completed: boolean,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
