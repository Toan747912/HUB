import { AssessmentDomainError } from '../errors/assessment-domain.error';
import { AssessmentStatusValue } from '../value-objects/assessment-status.vo';

const ALLOWED_TRANSITIONS: Record<AssessmentStatusValue, AssessmentStatusValue[]> = {
  DRAFT: ['COMPLETED', 'ARCHIVED'],
  COMPLETED: ['APPROVED', 'ARCHIVED'],
  APPROVED: ['ARCHIVED'],
  ARCHIVED: [],
};

export const ensureValidLifecycleTransition = (
  from: AssessmentStatusValue,
  to: AssessmentStatusValue,
): void => {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new AssessmentDomainError(
      'INVALID_STATE_TRANSITION',
      `Invalid transition from ${from} to ${to}`,
    );
  }
};
