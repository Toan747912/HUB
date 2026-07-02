export type PriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const ALLOWED_PRIORITIES: PriorityValue[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * Canonical priority vocabulary, shared across the goal and recommendation
 * modules (previously duplicated as GoalPriority and RecommendationPriority).
 */
export class Priority {
  private constructor(private readonly value: PriorityValue) {}

  static create(value: string): Priority {
    const normalized = value?.toUpperCase() as PriorityValue;
    if (!ALLOWED_PRIORITIES.includes(normalized)) {
      throw new Error('PRIORITY_INVALID');
    }
    return new Priority(normalized);
  }

  /** score: 0-100 overall priority score. */
  static fromScore(score: number): Priority {
    if (score < 25) return new Priority('LOW');
    if (score < 50) return new Priority('MEDIUM');
    if (score < 75) return new Priority('HIGH');
    return new Priority('CRITICAL');
  }

  getValue(): PriorityValue {
    return this.value;
  }
}
