export type RecommendationTypeValue =
  | 'TASK_PRIORITY'
  | 'DIFFICULTY_ADJUSTMENT'
  | 'REVIEW_SCHEDULE'
  | 'ROADMAP_ADJUSTMENT'
  | 'LEARNING_RESOURCE'
  | 'STRATEGY_CHANGE';

const ALLOWED_TYPES: RecommendationTypeValue[] = [
  'TASK_PRIORITY',
  'DIFFICULTY_ADJUSTMENT',
  'REVIEW_SCHEDULE',
  'ROADMAP_ADJUSTMENT',
  'LEARNING_RESOURCE',
  'STRATEGY_CHANGE'
];

export class RecommendationType {
  private constructor(private readonly value: RecommendationTypeValue) {}

  static create(value: string): RecommendationType {
    const normalized = value?.toUpperCase() as RecommendationTypeValue;
    if (!ALLOWED_TYPES.includes(normalized)) {
      throw new Error('RECOMMENDATION_TYPE_INVALID');
    }
    return new RecommendationType(normalized);
  }

  getValue(): RecommendationTypeValue {
    return this.value;
  }
}
