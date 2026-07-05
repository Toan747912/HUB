export enum LearningErrorCode {
  CYCLE_FAILED = 'CYCLE_FAILED',
}

/**
 * Typed failure for one learning cycle. Thrown by LearningService.runCycle()
 * instead of letting the underlying (extractor/repository) error escape
 * raw - callers (CoordinatorService/CollaborationService) treat learning as
 * best-effort regardless, but a typed error lets them log a code instead of
 * an opaque message.
 */
export class LearningExecutionError extends Error {
  constructor(
    public readonly code: LearningErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LearningExecutionError';
  }
}
