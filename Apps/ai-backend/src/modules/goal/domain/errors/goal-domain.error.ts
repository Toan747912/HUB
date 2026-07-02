export class GoalDomainError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_STATE_TRANSITION'
      | 'GOAL_TERMINAL_STATE_MUTATION_FORBIDDEN'
      | 'GOAL_VERSION_CONFLICT'
      | 'GOAL_PROGRESS_OUT_OF_BOUNDS'
      | 'GOAL_NOT_FOUND'
      | 'GOAL_MILESTONE_NOT_FOUND'
      | 'GOAL_CONSTRAINT_NOT_FOUND',
    message: string
  ) {
    super(message);
    this.name = 'GoalDomainError';
  }
}
