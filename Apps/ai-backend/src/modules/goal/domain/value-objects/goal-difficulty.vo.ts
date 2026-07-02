export type GoalDifficultyValue = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

const ALLOWED_DIFFICULTIES: GoalDifficultyValue[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

export class GoalDifficulty {
  private constructor(private readonly value: GoalDifficultyValue) {}

  static create(value: string): GoalDifficulty {
    const normalized = value?.toUpperCase() as GoalDifficultyValue;
    if (!ALLOWED_DIFFICULTIES.includes(normalized)) {
      throw new Error('GOAL_DIFFICULTY_INVALID');
    }
    return new GoalDifficulty(normalized);
  }

  getValue(): GoalDifficultyValue {
    return this.value;
  }
}
