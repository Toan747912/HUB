import { GoalDomainError } from '../errors/goal-domain.error';

export const ensureExpectedVersion = (currentVersion: number, expectedVersion: number): void => {
  if (currentVersion !== expectedVersion) {
    throw new GoalDomainError(
      'GOAL_VERSION_CONFLICT',
      `Expected version ${expectedVersion}, but aggregate is at version ${currentVersion}`
    );
  }
};
