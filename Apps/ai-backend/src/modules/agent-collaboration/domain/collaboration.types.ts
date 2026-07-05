/**
 * Named consensus strategies a collaboration session may request. Only
 * 'Majority' resolves today; the others exist as strategy contracts
 * registered in ConsensusService and resolve to a 'not_implemented' outcome
 * until a later work package implements them.
 */
export type ConsensusStrategyName = 'Majority' | 'Weighted' | 'Unanimous' | 'Confidence';

export enum CollaborationErrorCode {
  ROLE_NOT_FOUND = 'ROLE_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  STEP_EXECUTION_FAILED = 'STEP_EXECUTION_FAILED',
  INVALID_REQUEST = 'INVALID_REQUEST',
}

export class CollaborationExecutionError extends Error {
  constructor(
    public readonly code: CollaborationErrorCode,
    message: string,
    public readonly role?: string,
  ) {
    super(message);
    this.name = 'CollaborationExecutionError';
  }
}
