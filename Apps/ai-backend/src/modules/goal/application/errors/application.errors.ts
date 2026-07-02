export class GoalNotFoundError extends Error {
  constructor(goalId: string) {
    super(`Goal not found: ${goalId}`);
    this.name = 'GoalNotFoundError';
  }
}

export class GoalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoalValidationError';
  }
}

export class GoalVersionConflictError extends Error {
  constructor(expected: number, actual: number) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
    this.name = 'GoalVersionConflictError';
  }
}

export class GoalStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoalStateTransitionError';
  }
}
