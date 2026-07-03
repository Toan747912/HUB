import { Injectable } from '@nestjs/common';

type CircuitState = 'CLOSED' | 'OPEN';

type CircuitRecord = {
  state: CircuitState;
  failures: number;
  openedAt?: number;
  lastFailureAt?: number;
};

@Injectable()
export class CircuitBreakerService {
  private readonly failureThreshold = 3;
  private readonly cooldownMs = 30_000;
  private readonly circuits = new Map<string, CircuitRecord>();

  canExecute(jobId: string): boolean {
    const record = this.circuits.get(jobId);
    if (!record) {
      return true;
    }

    if (record.state === 'OPEN') {
      if (record.openedAt && Date.now() - record.openedAt >= this.cooldownMs) {
        this.circuits.set(jobId, {
          state: 'CLOSED',
          failures: 0,
          openedAt: undefined,
          lastFailureAt: undefined,
        });
        return true;
      }
      return false;
    }

    return true;
  }

  onSuccess(jobId: string): void {
    this.circuits.set(jobId, {
      state: 'CLOSED',
      failures: 0,
      openedAt: undefined,
      lastFailureAt: undefined,
    });
  }

  onFailure(jobId: string): void {
    const now = Date.now();
    const current = this.circuits.get(jobId) ?? { state: 'CLOSED' as CircuitState, failures: 0 };
    const failures = current.failures + 1;

    if (failures >= this.failureThreshold) {
      this.circuits.set(jobId, { state: 'OPEN', failures, openedAt: now, lastFailureAt: now });
      return;
    }

    this.circuits.set(jobId, {
      state: 'CLOSED',
      failures,
      openedAt: undefined,
      lastFailureAt: now,
    });
  }
}
