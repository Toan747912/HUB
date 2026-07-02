export class TargetDate {
  private constructor(private readonly value: Date) {}

  static create(value: string | Date): TargetDate {
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('TARGET_DATE_INVALID');
    }
    return new TargetDate(parsed);
  }

  getValue(): Date {
    return new Date(this.value.getTime());
  }

  toISOString(): string {
    return this.value.toISOString();
  }
}
