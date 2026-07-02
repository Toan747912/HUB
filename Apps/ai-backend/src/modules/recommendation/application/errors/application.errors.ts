export class RecommendationNotFoundError extends Error {
  constructor(recommendationId: string) {
    super(`Recommendation not found: ${recommendationId}`);
    this.name = 'RecommendationNotFoundError';
  }
}

export class RecommendationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationValidationError';
  }
}

export class RecommendationVersionConflictError extends Error {
  constructor(expected: number, actual: number) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
    this.name = 'RecommendationVersionConflictError';
  }
}

export class RecommendationStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecommendationStateTransitionError';
  }
}
