import { GoalDomainError } from '../errors/goal-domain.error';
import { GoalStatusValue } from '../value-objects/goal-status.vo';

const ALLOWED_TRANSITIONS: Record<GoalStatusValue, GoalStatusValue[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['IN_PROGRESS', 'ARCHIVED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  ARCHIVED: [],
};

export const ensureValidLifecycleTransition = (
  from: GoalStatusValue,
  to: GoalStatusValue,
): void => {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new GoalDomainError(
      'INVALID_STATE_TRANSITION',
      `Invalid transition from ${from} to ${to}`,
    );
  }
};
