export type GoalTypeValue = 'SKILL' | 'CERTIFICATION' | 'PROJECT' | 'KNOWLEDGE' | 'CAREER';

const ALLOWED_TYPES: GoalTypeValue[] = ['SKILL', 'CERTIFICATION', 'PROJECT', 'KNOWLEDGE', 'CAREER'];

export class GoalType {
  private constructor(private readonly value: GoalTypeValue) {}

  static create(value: string): GoalType {
    const normalized = value?.toUpperCase() as GoalTypeValue;
    if (!ALLOWED_TYPES.includes(normalized)) {
      throw new Error('GOAL_TYPE_INVALID');
    }
    return new GoalType(normalized);
  }

  getValue(): GoalTypeValue {
    return this.value;
  }
}
