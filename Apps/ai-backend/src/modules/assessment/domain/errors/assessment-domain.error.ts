export class AssessmentDomainError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_STATE_TRANSITION'
      | 'ASSESSMENT_LOCKED_FOR_RUN'
      | 'ASSESSMENT_VERSION_CONFLICT'
      | 'ASSESSMENT_CONFIDENCE_OUT_OF_BOUNDS'
      | 'ASSESSMENT_NOT_RUN_YET',
    message: string
  ) {
    super(message);
    this.name = 'AssessmentDomainError';
  }
}
