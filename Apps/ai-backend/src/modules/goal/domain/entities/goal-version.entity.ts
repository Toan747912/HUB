import { GoalDifficulty } from '../value-objects/goal-difficulty.vo';
import { GoalPriority } from '../value-objects/goal-priority.vo';
import { GoalType } from '../value-objects/goal-type.vo';
import { TargetDate } from '../value-objects/target-date.vo';

export class GoalVersion {
  constructor(
    public readonly version: number,
    public readonly title: string,
    public readonly description: string,
    public readonly type: GoalType,
    public readonly difficulty: GoalDifficulty,
    public readonly priority: GoalPriority,
    public readonly targetDate: TargetDate,
    public readonly createdAt: Date = new Date()
  ) {}
}
