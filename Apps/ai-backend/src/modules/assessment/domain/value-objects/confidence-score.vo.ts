export class ConfidenceScore {
  private constructor(private readonly value: number) {}

  static create(value: number): ConfidenceScore {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error('CONFIDENCE_SCORE_INVALID');
    }
    return new ConfidenceScore(Math.round(value));
  }

  getValue(): number {
    return this.value;
  }
}
