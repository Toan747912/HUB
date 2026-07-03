import { RoadmapDomainError } from '../errors/roadmap-domain.error';

export class RoadmapProgress {
  constructor(
    public readonly completionRatio: number,
    public readonly completedTaskIds: string[],
    public readonly updatedAt: Date = new Date(),
  ) {
    if (completionRatio < 0 || completionRatio > 100) {
      throw new RoadmapDomainError(
        'ROADMAP_PROGRESS_OUT_OF_BOUNDS',
        'Completion ratio must be between 0 and 100',
      );
    }
  }

  update(completionRatio: number, completedTaskIds: string[]): RoadmapProgress {
    return new RoadmapProgress(completionRatio, [...new Set(completedTaskIds)], new Date());
  }
}
