export class EngagementScore {
  private constructor(private readonly value: number) {}

  static create(value: number): EngagementScore {
    if (value === undefined || value === null || isNaN(value)) {
      throw new Error('EngagementScore: value must be a number');
    }
    const score = Math.round(value);
    if (score < 0 || score > 100) {
      throw new Error(`EngagementScore: value must be between 0 and 100, got ${score}`);
    }
    return new EngagementScore(score);
  }

  getValue(): number {
    return this.value;
  }
}
