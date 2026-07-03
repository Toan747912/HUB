import { RoadmapDomainError } from '../errors/roadmap-domain.error';

export const ensureExpectedVersion = (currentVersion: number, expectedVersion: number): void => {
  if (currentVersion !== expectedVersion) {
    throw new RoadmapDomainError(
      'ROADMAP_VERSION_CONFLICT',
      `Expected version ${expectedVersion}, but aggregate is at version ${currentVersion}`,
    );
  }
};
