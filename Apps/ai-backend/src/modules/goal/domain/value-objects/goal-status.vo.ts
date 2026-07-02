export type GoalStatusValue = 'DRAFT' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

const ALLOWED_STATUSES: GoalStatusValue[] = ['DRAFT', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];

export class GoalStatus {
  private constructor(private readonly value: GoalStatusValue) {}

  static create(value: string): GoalStatus {
    const normalized = value?.toUpperCase().replace(/\s+/g, '_') as GoalStatusValue;
    if (!ALLOWED_STATUSES.includes(normalized)) {
      throw new Error('GOAL_STATUS_INVALID');
    }
    return new GoalStatus(normalized);
  }

  static draft(): GoalStatus {
    return new GoalStatus('DRAFT');
  }

  getValue(): GoalStatusValue {
    return this.value;
  }

  isTerminal(): boolean {
    return this.value === 'COMPLETED' || this.value === 'ARCHIVED';
  }
}
