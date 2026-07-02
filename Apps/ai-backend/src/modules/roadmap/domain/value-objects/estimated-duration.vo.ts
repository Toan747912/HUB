export class EstimatedDuration {
  private constructor(private readonly days: number) {}

  static fromDays(days: number): EstimatedDuration {
    if (!Number.isFinite(days) || days < 0) {
      throw new Error('ESTIMATED_DURATION_INVALID');
    }
    return new EstimatedDuration(Math.round(days));
  }

  getDays(): number {
    return this.days;
  }

  getWeeks(): number {
    return Math.ceil(this.days / 7);
  }
}
