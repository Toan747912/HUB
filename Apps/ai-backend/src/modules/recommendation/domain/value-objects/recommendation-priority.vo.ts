export type RecommendationPriorityValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

const ALLOWED_PRIORITIES: RecommendationPriorityValue[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export class RecommendationPriority {
  private constructor(private readonly value: RecommendationPriorityValue) {}

  static create(value: string): RecommendationPriority {
    const normalized = value?.toUpperCase() as RecommendationPriorityValue;
    if (!ALLOWED_PRIORITIES.includes(normalized)) {
      throw new Error('RECOMMENDATION_PRIORITY_INVALID');
    }
    return new RecommendationPriority(normalized);
  }

  /** score: 0-100 overall priority score. */
  static fromScore(score: number): RecommendationPriority {
    if (score < 25) return new RecommendationPriority('LOW');
    if (score < 50) return new RecommendationPriority('MEDIUM');
    if (score < 75) return new RecommendationPriority('HIGH');
    return new RecommendationPriority('CRITICAL');
  }

  getValue(): RecommendationPriorityValue {
    return this.value;
  }
}
