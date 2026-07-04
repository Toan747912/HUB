import { LearningSessionDomainError } from '../errors/learning-session-domain.error';

export const ensureExpectedVersion = (currentVersion: number, expectedVersion: number): void => {
  if (currentVersion !== expectedVersion) {
    throw new LearningSessionDomainError(
      'SESSION_VERSION_CONFLICT',
      `Expected version ${expectedVersion}, but aggregate is at version ${currentVersion}`,
    );
  }
};
