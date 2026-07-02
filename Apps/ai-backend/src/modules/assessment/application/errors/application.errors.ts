export class AssessmentNotFoundError extends Error {
  constructor(assessmentId: string) {
    super(`Assessment not found: ${assessmentId}`);
    this.name = 'AssessmentNotFoundError';
  }
}

export class AssessmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentValidationError';
  }
}

export class AssessmentVersionConflictError extends Error {
  constructor(expected: number, actual: number) {
    super(`Version conflict: expected ${expected}, actual ${actual}`);
    this.name = 'AssessmentVersionConflictError';
  }
}

export class AssessmentStateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssessmentStateTransitionError';
  }
}
