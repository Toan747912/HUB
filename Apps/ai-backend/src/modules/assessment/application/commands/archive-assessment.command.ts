export class ArchiveAssessmentCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string
  ) {}
}
