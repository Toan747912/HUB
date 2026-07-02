export class RoadmapDomainError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_STATE_TRANSITION'
      | 'ROADMAP_TERMINAL_STATE_MUTATION_FORBIDDEN'
      | 'ROADMAP_VERSION_CONFLICT'
      | 'ROADMAP_PROGRESS_OUT_OF_BOUNDS'
      | 'ROADMAP_NOT_FOUND'
      | 'ROADMAP_TASK_NOT_FOUND'
      | 'ROADMAP_PLAN_EMPTY',
    message: string
  ) {
    super(message);
    this.name = 'RoadmapDomainError';
  }
}
