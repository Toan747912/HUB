export class EvidenceRecord {
  constructor(
    public readonly id: string,
    public readonly completedTasks: number,
    public readonly timeSpent: number,
    public readonly completionRate: number,
    public readonly interruptions: number,
    public readonly revisionCount: number,
    public readonly focusScore: number,
    public readonly engagementScore: number,
    public readonly recordedAt: Date = new Date(),
  ) {}
}
