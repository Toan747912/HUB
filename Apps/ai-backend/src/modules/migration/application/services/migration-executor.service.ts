import { Injectable } from '@nestjs/common';
import { ExecutionResult, IMigrationExecutor } from '../../domain/contracts/migration.contracts';
import { MigrationJob } from '../../domain/entities/migration-job.entity';
import { MigrationStep } from '../../domain/entities/migration-step.entity';
import { MigrationError } from '../../domain/errors/migration.error';
import { SqlExecutorService } from '../../infrastructure/sql/sql-executor.service';

@Injectable()
export class MigrationExecutorService implements IMigrationExecutor {
  constructor(private readonly sqlExecutorService: SqlExecutorService) {}

  async execute(job: MigrationJob, _traceId: string): Promise<ExecutionResult> {
    const orderedSteps = this.sortDeterministically(job.steps);
    const executedStepIds: string[] = [];

    for (const step of orderedSteps) {
      try {
        await this.sqlExecutorService.executeBatchInTransaction(step.sqlUpBatch);
        executedStepIds.push(step.id);
      } catch (error: unknown) {
        const normalized = this.normalizeError(error);
        return {
          success: false,
          executedStepIds,
          failedStepId: step.id,
          errorCode: normalized.error,
          errorMessage: normalized.message
        };
      }
    }

    return {
      success: true,
      executedStepIds
    };
  }

  private sortDeterministically(steps: MigrationStep[]): MigrationStep[] {
    const sorted = [...steps].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const known = new Set(sorted.map((s) => s.id));

    for (const step of sorted) {
      for (const dep of step.dependencies) {
        if (!known.has(dep)) {
          throw new MigrationError('DEPENDENCY_NOT_FOUND', `Missing dependency ${dep} for step ${step.id}`);
        }
        if (sorted.findIndex((s) => s.id === dep) > sorted.findIndex((s) => s.id === step.id)) {
          throw new MigrationError('INVALID_DEPENDENCY_ORDER', `Dependency ${dep} appears after ${step.id}`);
        }
      }
    }

    return sorted;
  }

  private normalizeError(error: unknown): MigrationError {
    if (error instanceof MigrationError) {
      return error;
    }

    if (error instanceof Error) {
      return new MigrationError('MIGRATION_EXECUTION_FAILED', 'Migration execution failed', {
        name: error.name
      });
    }

    return new MigrationError('MIGRATION_EXECUTION_FAILED', 'Migration execution failed');
  }
}
