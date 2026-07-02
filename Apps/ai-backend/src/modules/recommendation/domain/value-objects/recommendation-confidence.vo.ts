export class RecommendationConfidence {
  private constructor(private readonly value: number) {}

  static create(value: number): RecommendationConfidence {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error('RECOMMENDATION_CONFIDENCE_INVALID');
    }
    return new RecommendationConfidence(Math.round(value));
  }

  getValue(): number {
    return this.value;
  }
}
