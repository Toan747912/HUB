export type StepOutcomeStatus = 'completed' | 'failed';

export interface StepOutcome {
  stepId: string;
  status: StepOutcomeStatus;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
}

/**
 * Tracks a single workflow run: which step is current, which steps finished
 * or failed, their outputs/errors, and overall timing - everything the
 * runtime needs to build the final IAgentResult and observability payloads.
 */
export class ExecutionState {
  readonly traceId: string;
  readonly startedAt: Date;
  endedAt?: Date;
  currentStepId: string | null = null;

  /** Set by AgentRuntimeService when a LifecycleService is wired in, so
   * RuntimeExecutor can notify it before/after each step without agent-core
   * needing to know about lifecycle tracking. */
  instanceId: string | null = null;

  readonly completedSteps: string[] = [];
  readonly failedSteps: string[] = [];
  readonly stepOutputs = new Map<string, Record<string, unknown>>();
  readonly stepErrors = new Map<string, string>();
  private readonly stepStartedAt = new Map<string, Date>();

  constructor(traceId: string) {
    this.traceId = traceId;
    this.startedAt = new Date();
  }

  startStep(stepId: string): void {
    this.currentStepId = stepId;
    this.stepStartedAt.set(stepId, new Date());
  }

  completeStep(stepId: string, output: Record<string, unknown>): void {
    this.completedSteps.push(stepId);
    this.stepOutputs.set(stepId, output);
    this.currentStepId = null;
  }

  failStep(stepId: string, error: string): void {
    this.failedSteps.push(stepId);
    this.stepErrors.set(stepId, error);
    this.currentStepId = null;
  }

  stepDurationMs(stepId: string): number {
    const start = this.stepStartedAt.get(stepId);
    if (!start) return 0;
    return Date.now() - start.getTime();
  }

  finish(): void {
    this.endedAt = new Date();
  }

  get durationMs(): number {
    const end = this.endedAt ?? new Date();
    return end.getTime() - this.startedAt.getTime();
  }
}
