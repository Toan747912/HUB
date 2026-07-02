import { Injectable } from '@nestjs/common';
import { IRollbackHandler, RollbackResult } from '../../domain/contracts/migration.contracts';
import { MigrationJob } from '../../domain/entities/migration-job.entity';
import { MigrationStep } from '../../domain/entities/migration-step.entity';
import { SqlExecutorService } from '../../infrastructure/sql/sql-executor.service';
import { MigrationError } from '../../domain/errors/migration.error';

@Injectable()
export class RollbackService implements IRollbackHandler {
  constructor(private readonly sqlExecutorService: SqlExecutorService) {}

  async rollback(job: MigrationJob, executedSteps: MigrationStep[], _traceId: string): Promise<RollbackResult> {
    const rolledBackStepIds: string[] = [];
    const executedStepIdSet = new Set(executedSteps.map((s) => s.id));
    const reverseOrdered = [...job.steps]
      .filter((s) => executedStepIdSet.has(s.id))
      .sort((a, b) => b.order - a.order || b.id.localeCompare(a.id));

    for (const step of reverseOrdered) {
      if (!step.sqlDownBatch.length) {
        continue;
      }

      try {
        await this.sqlExecutorService.executeBatchInTransaction(step.sqlDownBatch);
        rolledBackStepIds.push(step.id);
      } catch (error: unknown) {
        const normalized = this.normalize(error);
        return {
          success: false,
          rolledBackStepIds,
          errorCode: normalized.error,
          errorMessage: normalized.message
        };
      }
    }

    return {
      success: true,
      rolledBackStepIds
    };
  }

  private normalize(error: unknown): MigrationError {
    if (error instanceof MigrationError) {
      return error;
    }

    if (error instanceof Error) {
      return new MigrationError('ROLLBACK_FAILED', 'Rollback failed', { name: error.name });
    }

    return new MigrationError('ROLLBACK_FAILED', 'Rollback failed');
  }
}
