export class RecordEvidenceCommand {
  constructor(
    public readonly sessionId: string,
    public readonly evidenceId: string,
    public readonly activityId: string | undefined,
    public readonly completedTasks: number,
    public readonly timeSpent: number,
    public readonly interruptions: number,
    public readonly revisionCount: number,
    public readonly focusScore: number,
    public readonly engagementScore: number,
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
