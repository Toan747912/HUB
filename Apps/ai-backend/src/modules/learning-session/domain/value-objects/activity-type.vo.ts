export type ActivityTypeValue =
  'STUDY' | 'PRACTICE' | 'REVIEW' | 'QUIZ' | 'CODING' | 'READING' | 'REFLECTION' | 'BREAK';

const ALLOWED_TYPES: ActivityTypeValue[] = [
  'STUDY',
  'PRACTICE',
  'REVIEW',
  'QUIZ',
  'CODING',
  'READING',
  'REFLECTION',
  'BREAK',
];

export class ActivityType {
  private constructor(private readonly value: ActivityTypeValue) {}

  static create(value: string): ActivityType {
    const normalized = value?.toUpperCase().trim() as ActivityTypeValue;
    if (!ALLOWED_TYPES.includes(normalized)) {
      throw new Error(`ACTIVITY_TYPE_INVALID: ${value}`);
    }
    return new ActivityType(normalized);
  }

  getValue(): ActivityTypeValue {
    return this.value;
  }
}
