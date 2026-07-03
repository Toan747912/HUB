import { RecommendationDomainError } from '../errors/recommendation-domain.error';
import { RecommendationStatusValue } from '../value-objects/recommendation-status.vo';

const ALLOWED_TRANSITIONS: Record<RecommendationStatusValue, RecommendationStatusValue[]> = {
  GENERATED: ['APPROVED', 'REJECTED', 'ARCHIVED'],
  APPROVED: ['ARCHIVED'],
  REJECTED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const ensureValidLifecycleTransition = (
  from: RecommendationStatusValue,
  to: RecommendationStatusValue,
): void => {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new RecommendationDomainError(
      'INVALID_STATE_TRANSITION',
      `Invalid transition from ${from} to ${to}`,
    );
  }
};
