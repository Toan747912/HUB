export type LearningStrategyValue = 'REVIEW' | 'PRACTICE' | 'ADVANCE' | 'SLOW_DOWN' | 'SKIP' | 'REPEAT' | 'DEEP_DIVE' | 'RECOVERY';

const ALLOWED_STRATEGIES: LearningStrategyValue[] = [
  'REVIEW',
  'PRACTICE',
  'ADVANCE',
  'SLOW_DOWN',
  'SKIP',
  'REPEAT',
  'DEEP_DIVE',
  'RECOVERY'
];

export class LearningStrategy {
  private constructor(private readonly value: LearningStrategyValue) {}

  static create(value: string): LearningStrategy {
    const normalized = value?.toUpperCase().replace(/\s+/g, '_') as LearningStrategyValue;
    if (!ALLOWED_STRATEGIES.includes(normalized)) {
      throw new Error('LEARNING_STRATEGY_INVALID');
    }
    return new LearningStrategy(normalized);
  }

  getValue(): LearningStrategyValue {
    return this.value;
  }
}

export const ALL_LEARNING_STRATEGIES: LearningStrategyValue[] = [...ALLOWED_STRATEGIES];
