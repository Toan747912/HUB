export type GoalPriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const WEIGHT_BY_PRIORITY: Record<GoalPriorityValue, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

export class PriorityWeight {
  private constructor(private readonly value: number) {}

  static fromGoalPriority(priority: string): PriorityWeight {
    const normalized = priority?.toUpperCase() as GoalPriorityValue;
    const weight = WEIGHT_BY_PRIORITY[normalized];
    if (!weight) {
      throw new Error('PRIORITY_WEIGHT_INVALID');
    }
    return new PriorityWeight(weight);
  }

  getValue(): number {
    return this.value;
  }
}
