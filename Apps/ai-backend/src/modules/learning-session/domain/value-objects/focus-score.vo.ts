export class FocusScore {
  private constructor(private readonly value: number) {}

  static create(value: number): FocusScore {
    if (value === undefined || value === null || isNaN(value)) {
      throw new Error('FocusScore: value must be a number');
    }
    const score = Math.round(value);
    if (score < 0 || score > 100) {
      throw new Error(`FocusScore: value must be between 0 and 100, got ${score}`);
    }
    return new FocusScore(score);
  }

  getValue(): number {
    return this.value;
  }
}
