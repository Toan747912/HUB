import { RoadmapDomainError } from '../errors/roadmap-domain.error';
import { RoadmapStatusValue } from '../value-objects/roadmap-status.vo';

const ALLOWED_TRANSITIONS: Record<RoadmapStatusValue, RoadmapStatusValue[]> = {
  DRAFT: ['PUBLISHED', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED', 'COMPLETED'],
  COMPLETED: [],
  ARCHIVED: [],
};

export const ensureValidLifecycleTransition = (
  from: RoadmapStatusValue,
  to: RoadmapStatusValue,
): void => {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new RoadmapDomainError(
      'INVALID_STATE_TRANSITION',
      `Invalid transition from ${from} to ${to}`,
    );
  }
};
