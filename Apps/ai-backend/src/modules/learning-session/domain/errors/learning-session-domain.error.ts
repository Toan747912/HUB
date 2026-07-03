export class LearningSessionDomainError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_STATE_TRANSITION'
      | 'SESSION_TERMINAL_STATE_MUTATION_FORBIDDEN'
      | 'SESSION_VERSION_CONFLICT'
      | 'SESSION_NOT_FOUND'
      | 'ACTIVITY_NOT_FOUND'
      | 'TASK_NOT_FOUND'
      | 'TIMER_NOT_ACTIVE',
    message: string,
  ) {
    super(message);
    this.name = 'LearningSessionDomainError';
  }
}
