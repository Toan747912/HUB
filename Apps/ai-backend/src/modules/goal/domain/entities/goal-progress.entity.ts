import { GoalDomainError } from '../errors/goal-domain.error';

export class GoalProgress {
  constructor(
    public readonly completionRatio: number,
    public readonly reachedMilestoneIds: string[],
    public readonly updatedAt: Date = new Date(),
  ) {
    if (completionRatio < 0 || completionRatio > 100) {
      throw new GoalDomainError(
        'GOAL_PROGRESS_OUT_OF_BOUNDS',
        'Completion ratio must be between 0 and 100',
      );
    }
  }

  update(completionRatio: number, reachedMilestoneIds: string[]): GoalProgress {
    return new GoalProgress(completionRatio, [...new Set(reachedMilestoneIds)], new Date());
  }
}
