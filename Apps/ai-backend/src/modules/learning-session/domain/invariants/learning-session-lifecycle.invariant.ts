import { LearningSessionDomainError } from '../errors/learning-session-domain.error';
import { SessionStatusValue } from '../value-objects/session-status.vo';

const ALLOWED_TRANSITIONS: Record<SessionStatusValue, SessionStatusValue[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
  PAUSED: ['ACTIVE', 'ARCHIVED'],
  COMPLETED: [],
  CANCELLED: [],
  ARCHIVED: [],
};

export const ensureValidLifecycleTransition = (
  from: SessionStatusValue,
  to: SessionStatusValue,
): void => {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new LearningSessionDomainError(
      'INVALID_STATE_TRANSITION',
      `Invalid transition from ${from} to ${to}`,
    );
  }
};
