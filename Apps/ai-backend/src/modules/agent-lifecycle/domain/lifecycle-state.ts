export enum LifecycleState {
  CREATED = 'CREATED',
  READY = 'READY',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  FAILED = 'FAILED',
  COMPLETED = 'COMPLETED',
  STOPPED = 'STOPPED',
}

export const TERMINAL_LIFECYCLE_STATES: ReadonlySet<LifecycleState> = new Set([
  LifecycleState.FAILED,
  LifecycleState.COMPLETED,
  LifecycleState.STOPPED,
]);

export const ACTIVE_LIFECYCLE_STATES: LifecycleState[] = [
  LifecycleState.CREATED,
  LifecycleState.READY,
  LifecycleState.RUNNING,
  LifecycleState.WAITING,
];
