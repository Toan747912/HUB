export class StudyTimer {
  constructor(
    public readonly id: string,
    public readonly startedAt: Date,
    public readonly pausedAt: Date | null = null,
    public readonly elapsedSeconds: number = 0,
    public readonly interruptions: number = 0,
  ) {}

  static start(id: string): StudyTimer {
    return new StudyTimer(id, new Date(), null, 0, 0);
  }

  pause(): StudyTimer {
    if (this.pausedAt) {
      return this; // Already paused
    }
    const activeSeconds = Math.round((Date.now() - this.startedAt.getTime()) / 1000);
    return new StudyTimer(
      this.id,
      this.startedAt,
      new Date(),
      this.elapsedSeconds + activeSeconds,
      this.interruptions + 1,
    );
  }

  resume(): StudyTimer {
    if (!this.pausedAt) {
      return this; // Not paused
    }
    return new StudyTimer(this.id, new Date(), null, this.elapsedSeconds, this.interruptions);
  }

  getCurrentElapsedSeconds(): number {
    if (this.pausedAt) {
      return this.elapsedSeconds;
    }
    const ongoingSeconds = Math.round((Date.now() - this.startedAt.getTime()) / 1000);
    return this.elapsedSeconds + ongoingSeconds;
  }
}
