export type RecommendationStatusValue = 'GENERATED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

const ALLOWED_STATUSES: RecommendationStatusValue[] = ['GENERATED', 'APPROVED', 'REJECTED', 'ARCHIVED'];

export class RecommendationStatus {
  private constructor(private readonly value: RecommendationStatusValue) {}

  static create(value: string): RecommendationStatus {
    const normalized = value?.toUpperCase().replace(/\s+/g, '_') as RecommendationStatusValue;
    if (!ALLOWED_STATUSES.includes(normalized)) {
      throw new Error('RECOMMENDATION_STATUS_INVALID');
    }
    return new RecommendationStatus(normalized);
  }

  static generated(): RecommendationStatus {
    return new RecommendationStatus('GENERATED');
  }

  getValue(): RecommendationStatusValue {
    return this.value;
  }

  isTerminal(): boolean {
    return this.value === 'ARCHIVED';
  }
}
