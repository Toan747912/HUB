export class RecommendationDomainError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_STATE_TRANSITION'
      | 'RECOMMENDATION_VERSION_CONFLICT'
      | 'RECOMMENDATION_SCORE_OUT_OF_BOUNDS'
      | 'RECOMMENDATION_EMPTY_PLAN',
    message: string
  ) {
    super(message);
    this.name = 'RecommendationDomainError';
  }
}
