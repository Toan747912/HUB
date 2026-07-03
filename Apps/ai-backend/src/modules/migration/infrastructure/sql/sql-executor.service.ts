import { Injectable } from '@nestjs/common';
import { MigrationError } from '../../domain/errors/migration.error';

type TransactionContext = {
  statements: string[];
  committed: boolean;
  rolledBack: boolean;
};

@Injectable()
export class SqlExecutorService {
  private readonly maxRetries = 3;
  private readonly stepTimeoutMs = 8_000;

  async executeBatchInTransaction(sqlBatch: string[]): Promise<void> {
    if (!Array.isArray(sqlBatch) || sqlBatch.length === 0) {
      throw new MigrationError('SQL_BATCH_EMPTY', 'SQL batch cannot be empty');
    }

    const tx = await this.beginTransaction();

    try {
      await this.withRetry(async () => {
        await this.withTimeout(
          this.executeBatch(tx, sqlBatch),
          this.stepTimeoutMs,
          'SQL step timed out',
        );
      });

      await this.commitTransaction(tx);
    } catch (error: unknown) {
      await this.rollbackTransaction(tx);
      throw this.normalizeError(error);
    }
  }

  private async beginTransaction(): Promise<TransactionContext> {
    return {
      statements: [],
      committed: false,
      rolledBack: false,
    };
  }

  private async commitTransaction(tx: TransactionContext): Promise<void> {
    if (tx.rolledBack) {
      throw new MigrationError(
        'TRANSACTION_ALREADY_ROLLED_BACK',
        'Cannot commit a rolled back transaction',
      );
    }
    tx.committed = true;
  }

  private async rollbackTransaction(tx: TransactionContext): Promise<void> {
    if (tx.committed) {
      throw new MigrationError(
        'TRANSACTION_ALREADY_COMMITTED',
        'Cannot rollback a committed transaction',
      );
    }
    tx.rolledBack = true;
  }

  private async executeBatch(tx: TransactionContext, sqlBatch: string[]): Promise<void> {
    for (const sql of sqlBatch) {
      if (!sql || !sql.trim()) {
        throw new MigrationError('INVALID_SQL', 'Encountered empty SQL statement');
      }
      tx.statements.push(sql.trim());
    }
  }

  private async withRetry(operation: () => Promise<void>): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        await operation();
        return;
      } catch (error: unknown) {
        lastError = error;
        if (attempt === this.maxRetries) {
          break;
        }
      }
    }

    throw new MigrationError(
      'SQL_BATCH_RETRY_EXHAUSTED',
      'SQL batch execution failed after retries',
      {
        retries: this.maxRetries,
        cause: this.serializeError(lastError),
      },
    );
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new MigrationError('STEP_TIMEOUT', timeoutMessage, { timeoutMs }));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private normalizeError(error: unknown): MigrationError {
    if (error instanceof MigrationError) {
      return error;
    }

    if (error instanceof Error) {
      return new MigrationError('SQL_EXECUTION_FAILED', 'SQL execution failed', {
        name: error.name,
      });
    }

    return new MigrationError('SQL_EXECUTION_FAILED', 'SQL execution failed');
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof MigrationError) {
      return {
        error: error.error,
        message: error.message,
        details: error.details,
      };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }

    return {
      error: 'UNKNOWN_ERROR',
    };
  }
}
