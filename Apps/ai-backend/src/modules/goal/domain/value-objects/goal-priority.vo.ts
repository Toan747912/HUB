export type GoalPriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const ALLOWED_PRIORITIES: GoalPriorityValue[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export class GoalPriority {
  private constructor(private readonly value: GoalPriorityValue) {}

  static create(value: string): GoalPriority {
    const normalized = value?.toUpperCase() as GoalPriorityValue;
    if (!ALLOWED_PRIORITIES.includes(normalized)) {
      throw new Error('GOAL_PRIORITY_INVALID');
    }
    return new GoalPriority(normalized);
  }

  getValue(): GoalPriorityValue {
    return this.value;
  }
}
