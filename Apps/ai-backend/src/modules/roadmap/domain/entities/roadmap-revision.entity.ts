export type RoadmapRevisionReason = 'CREATED' | 'UPDATED' | 'REGENERATED';

export class RoadmapRevision {
  constructor(
    public readonly version: number,
    public readonly reason: RoadmapRevisionReason,
    public readonly plannerVersion: string,
    public readonly phaseCount: number,
    public readonly milestoneCount: number,
    public readonly taskCount: number,
    public readonly estimatedDurationDays: number,
    public readonly complexity: string,
    public readonly createdAt: Date = new Date()
  ) {}
}
