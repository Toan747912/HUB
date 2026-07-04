export class SessionReflection {
  constructor(
    public readonly content: string,
    public readonly rating: number,
    public readonly recordedAt: Date = new Date(),
  ) {
    if (rating < 1 || rating > 5) {
      throw new Error(`SessionReflection rating must be between 1 and 5, got ${rating}`);
    }
  }
}
