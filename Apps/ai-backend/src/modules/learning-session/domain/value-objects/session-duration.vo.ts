export class SessionDuration {
  private constructor(private readonly seconds: number) {}

  static create(seconds: number): SessionDuration {
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
      throw new Error('SessionDuration: seconds must be a number');
    }
    if (seconds < 0) {
      throw new Error('SessionDuration: seconds cannot be negative');
    }
    return new SessionDuration(Math.round(seconds));
  }

  getSeconds(): number {
    return this.seconds;
  }

  getMinutes(): number {
    return Math.round(this.seconds / 60);
  }
}
