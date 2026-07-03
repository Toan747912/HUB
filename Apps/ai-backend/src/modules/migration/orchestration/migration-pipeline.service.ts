import { Inject, Injectable } from '@nestjs/common';
import { MigrationExecutorService } from '../application/services/migration-executor.service';
import { MigrationValidatorService } from '../application/services/migration-validator.service';
import { RollbackService } from '../application/services/rollback.service';
import {
  IMigrationLogRepository,
  IMigrationRepository,
} from '../domain/contracts/migration-repository.contract';
import { MigrationJob } from '../domain/entities/migration-job.entity';
import { MigrationState } from '../domain/enums/migration-state.enum';
import { MigrationError } from '../domain/errors/migration.error';
import { CircuitBreakerService } from '../infrastructure/resilience/circuit-breaker.service';
import { StructuredLoggerService } from '../infrastructure/logging/structured-logger.service';
import {
  MIGRATION_LOG_REPOSITORY,
  MIGRATION_REPOSITORY,
} from '../infrastructure/tokens/migration.tokens';

@Injectable()
export class MigrationPipeline {
  private readonly runLocks = new Map<
    string,
    Promise<
      | { success: true; state: MigrationState }
      | { success: false; error: string; message: string; details?: unknown }
    >
  >();
  constructor(
    private readonly validatorService: MigrationValidatorService,
    private readonly executorService: MigrationExecutorService,
    private readonly rollbackService: RollbackService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly structuredLogger: StructuredLoggerService,
    @Inject(MIGRATION_REPOSITORY) private readonly migrationRepository: IMigrationRepository,
    @Inject(MIGRATION_LOG_REPOSITORY)
    private readonly migrationLogRepository: IMigrationLogRepository,
  ) {}

  async run(
    jobId: string,
    traceId: string,
  ): Promise<
    | { success: true; state: MigrationState }
    | { success: false; error: string; message: string; details?: unknown }
  > {
    const inFlight = this.runLocks.get(jobId);
    if (inFlight) {
      return inFlight;
    }

    const runPromise = this.runInternal(jobId, traceId)
      .catch((error: unknown) =>
        this.fail(
          this.normalize(error).error,
          this.normalize(error).message,
          this.normalize(error).details,
        ),
      )
      .finally(() => {
        this.runLocks.delete(jobId);
      });

    this.runLocks.set(jobId, runPromise);
    return runPromise;
  }

  private async runInternal(
    jobId: string,
    traceId: string,
  ): Promise<
    | { success: true; state: MigrationState }
    | { success: false; error: string; message: string; details?: unknown }
  > {
    const job = await this.mustGetJob(jobId);
    const ordered = [...job.steps].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    job.steps.splice(0, job.steps.length, ...ordered);

    if (job.state === MigrationState.COMMITTED) {
      await this.log(traceId, jobId, 'IDEMPOTENT', 0, 'SUCCESS', 'Migration already committed');
      return { success: true, state: MigrationState.COMMITTED };
    }

    if (!this.circuitBreakerService.canExecute(jobId)) {
      await this.log(
        traceId,
        jobId,
        'CIRCUIT',
        0,
        'FAILED',
        'Circuit breaker is OPEN for this migration job',
        'CIRCUIT_OPEN',
      );
      return this.fail('CIRCUIT_OPEN', 'Circuit breaker is OPEN for this migration job');
    }

    try {
      await this.transition(
        job,
        traceId,
        'PLAN',
        MigrationState.PENDING,
        'SUCCESS',
        'Migration planned',
      );

      await this.transition(
        job,
        traceId,
        'VALIDATE',
        MigrationState.VALIDATING,
        'SUCCESS',
        'Validation started',
      );
      const validation = await this.validatorService.validate(job, traceId);
      if (!validation.valid) {
        this.circuitBreakerService.onFailure(jobId);
        await this.transition(
          job,
          traceId,
          'VALIDATE',
          MigrationState.FAILED,
          'FAILED',
          'Validation failed',
          'VALIDATION_FAILED',
          {
            issues: validation.issues,
          },
        );
        return this.fail('VALIDATION_FAILED', 'Migration validation failed', {
          issues: validation.issues,
        });
      }

      await this.transition(
        job,
        traceId,
        'EXECUTE',
        MigrationState.EXECUTING,
        'SUCCESS',
        'Execution started',
      );
      const execution = await this.executorService.execute(job, traceId);
      if (!execution.success) {
        this.circuitBreakerService.onFailure(jobId);

        const executedSteps = job.steps.filter((s) => execution.executedStepIds.includes(s.id));
        await this.transition(
          job,
          traceId,
          'EXECUTE',
          MigrationState.FAILED,
          'FAILED',
          'Execution failed',
          execution.errorCode,
          {
            failedStepId: execution.failedStepId,
          },
        );

        const rollback = await this.rollbackService.rollback(job, executedSteps, traceId);
        if (!rollback.success) {
          await this.transition(
            job,
            traceId,
            'ROLLBACK',
            MigrationState.FAILED,
            'FAILED',
            'Rollback failed',
            rollback.errorCode,
            {
              rolledBackStepIds: rollback.rolledBackStepIds,
            },
          );
          return this.fail(
            rollback.errorCode ?? 'ROLLBACK_FAILED',
            rollback.errorMessage ?? 'Rollback failed',
          );
        }

        await this.transition(
          job,
          traceId,
          'ROLLBACK',
          MigrationState.ROLLED_BACK,
          'SUCCESS',
          'Rollback completed',
        );
        return this.fail(
          execution.errorCode ?? 'EXECUTION_FAILED',
          execution.errorMessage ?? 'Execution failed',
        );
      }

      await this.transition(
        job,
        traceId,
        'VERIFY',
        MigrationState.VERIFYING,
        'SUCCESS',
        'Verification started',
      );
      await this.transition(
        job,
        traceId,
        'COMMIT',
        MigrationState.COMMITTED,
        'SUCCESS',
        'Migration committed',
      );

      this.circuitBreakerService.onSuccess(jobId);
      return { success: true, state: MigrationState.COMMITTED };
    } catch (error: unknown) {
      this.circuitBreakerService.onFailure(jobId);
      const normalized = this.normalize(error);
      await this.transition(
        job,
        traceId,
        'PIPELINE',
        MigrationState.FAILED,
        'FAILED',
        normalized.message,
        normalized.error,
      );
      return this.fail(normalized.error, normalized.message, normalized.details);
    }
  }

  async validate(
    jobId: string,
    traceId: string,
  ): Promise<
    { success: true } | { success: false; error: string; message: string; details?: unknown }
  > {
    const job = await this.mustGetJob(jobId);
    const validation = await this.validatorService.validate(job, traceId);

    if (!validation.valid) {
      await this.log(
        traceId,
        jobId,
        'VALIDATE',
        0,
        'FAILED',
        'Validation failed',
        'VALIDATION_FAILED',
        {
          issues: validation.issues,
        },
      );
      return this.fail('VALIDATION_FAILED', 'Migration validation failed', {
        issues: validation.issues,
      });
    }

    await this.log(traceId, jobId, 'VALIDATE', 0, 'SUCCESS', 'Validation passed');
    return { success: true };
  }

  async rollback(
    jobId: string,
    traceId: string,
  ): Promise<
    | { success: true; state: MigrationState }
    | { success: false; error: string; message: string; details?: unknown }
  > {
    const job = await this.mustGetJob(jobId);
    const rollback = await this.rollbackService.rollback(job, job.steps, traceId);

    if (!rollback.success) {
      await this.transition(
        job,
        traceId,
        'ROLLBACK',
        MigrationState.FAILED,
        'FAILED',
        rollback.errorMessage ?? 'Rollback failed',
        rollback.errorCode,
      );
      return this.fail(
        rollback.errorCode ?? 'ROLLBACK_FAILED',
        rollback.errorMessage ?? 'Rollback failed',
      );
    }

    await this.transition(
      job,
      traceId,
      'ROLLBACK',
      MigrationState.ROLLED_BACK,
      'SUCCESS',
      'Rollback completed',
    );
    return { success: true, state: MigrationState.ROLLED_BACK };
  }

  private async mustGetJob(jobId: string): Promise<MigrationJob> {
    const job = await this.migrationRepository.findByJobId(jobId);
    if (!job) {
      throw new MigrationError('MIGRATION_JOB_NOT_FOUND', `Migration job not found: ${jobId}`);
    }
    return job;
  }

  private async transition(
    job: MigrationJob,
    traceId: string,
    step: string,
    state: MigrationState,
    status: 'SUCCESS' | 'FAILED',
    message: string,
    errorType?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const start = Date.now();
    job.state = state;
    await this.migrationRepository.updateState(job.jobId, state);
    await this.log(
      traceId,
      job.jobId,
      step,
      Date.now() - start,
      status,
      message,
      errorType,
      details,
    );
  }

  private async log(
    traceId: string,
    jobId: string,
    step: string,
    latencyMs: number,
    status: 'SUCCESS' | 'FAILED',
    message: string,
    errorType?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const payload = {
      traceId,
      jobId,
      step,
      latencyMs,
      status,
      errorType,
      message,
      details,
    };

    if (status === 'FAILED') {
      this.structuredLogger.error(payload);
    } else {
      this.structuredLogger.info(payload);
    }

    await this.migrationLogRepository.log({
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  private normalize(error: unknown): MigrationError {
    if (error instanceof MigrationError) {
      return error;
    }

    if (error instanceof Error) {
      return new MigrationError('MIGRATION_PIPELINE_FAILED', 'Migration pipeline failed', {
        name: error.name,
      });
    }

    return new MigrationError('MIGRATION_PIPELINE_FAILED', 'Migration pipeline failed');
  }

  private fail(
    error: string,
    message: string,
    details?: unknown,
  ): { success: false; error: string; message: string; details?: unknown } {
    return {
      success: false,
      error,
      message,
      details,
    };
  }
}
