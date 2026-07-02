import { RecommendationDomainError } from '../errors/recommendation-domain.error';

export const ensureExpectedVersion = (currentVersion: number, expectedVersion: number): void => {
  if (currentVersion !== expectedVersion) {
    throw new RecommendationDomainError(
      'RECOMMENDATION_VERSION_CONFLICT',
      `Expected version ${expectedVersion}, but aggregate is at version ${currentVersion}`
    );
  }
};
