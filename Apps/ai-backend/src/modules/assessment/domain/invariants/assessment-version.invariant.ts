import { AssessmentDomainError } from '../errors/assessment-domain.error';

export const ensureExpectedVersion = (currentVersion: number, expectedVersion: number): void => {
  if (currentVersion !== expectedVersion) {
    throw new AssessmentDomainError(
      'ASSESSMENT_VERSION_CONFLICT',
      `Expected version ${expectedVersion}, but aggregate is at version ${currentVersion}`,
    );
  }
};
