import { ActivityType } from '../value-objects/activity-type.vo';

export class LearningActivity {
  constructor(
    public readonly id: string,
    public readonly type: ActivityType,
    public readonly status: 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' = 'PLANNED',
    public readonly startedAt: Date | null = null,
    public readonly endedAt: Date | null = null,
    public readonly timeSpent: number = 0,
  ) {}

  start(): LearningActivity {
    return new LearningActivity(this.id, this.type, 'ACTIVE', new Date(), null, 0);
  }

  complete(timeSpentSeconds: number): LearningActivity {
    return new LearningActivity(
      this.id,
      this.type,
      'COMPLETED',
      this.startedAt,
      new Date(),
      timeSpentSeconds,
    );
  }

  cancel(): LearningActivity {
    return new LearningActivity(
      this.id,
      this.type,
      'CANCELLED',
      this.startedAt,
      new Date(),
      this.timeSpent,
    );
  }
}
