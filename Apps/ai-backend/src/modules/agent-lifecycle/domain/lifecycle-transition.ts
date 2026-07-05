import { LifecycleState } from './lifecycle-state';

/**
 * CREATED -> READY -> RUNNING <-> WAITING -> COMPLETED/FAILED, with STOPPED
 * reachable from any non-terminal state. FAILED/COMPLETED/STOPPED are terminal.
 */
export const VALID_LIFECYCLE_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  [LifecycleState.CREATED]: [LifecycleState.READY, LifecycleState.STOPPED],
  [LifecycleState.READY]: [LifecycleState.RUNNING, LifecycleState.STOPPED],
  [LifecycleState.RUNNING]: [
    LifecycleState.WAITING,
    LifecycleState.COMPLETED,
    LifecycleState.FAILED,
    LifecycleState.STOPPED,
  ],
  [LifecycleState.WAITING]: [LifecycleState.RUNNING, LifecycleState.FAILED, LifecycleState.STOPPED],
  [LifecycleState.FAILED]: [],
  [LifecycleState.COMPLETED]: [],
  [LifecycleState.STOPPED]: [],
};

export class LifecycleTransitionError extends Error {
  constructor(
    public readonly instanceId: string,
    public readonly from: LifecycleState,
    public readonly to: LifecycleState,
  ) {
    super(`Invalid lifecycle transition for instance ${instanceId}: ${from} -> ${to}`);
    this.name = 'LifecycleTransitionError';
  }
}

export function assertValidLifecycleTransition(
  instanceId: string,
  from: LifecycleState,
  to: LifecycleState,
): void {
  const allowed = VALID_LIFECYCLE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new LifecycleTransitionError(instanceId, from, to);
  }
}
