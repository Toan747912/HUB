import { MigrationJob } from '../entities/migration-job.entity';
import { MigrationStep } from '../entities/migration-step.entity';

export interface ValidationIssue {
  stepId: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ExecutionResult {
  success: boolean;
  executedStepIds: string[];
  failedStepId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface RollbackResult {
  success: boolean;
  rolledBackStepIds: string[];
  errorCode?: string;
  errorMessage?: string;
}

export interface IMigrationExecutor {
  execute(job: MigrationJob, traceId: string): Promise<ExecutionResult>;
}

export interface IMigrationValidator {
  validate(job: MigrationJob, traceId: string): Promise<ValidationResult>;
}

export interface IRollbackHandler {
  rollback(
    job: MigrationJob,
    executedSteps: MigrationStep[],
    traceId: string,
  ): Promise<RollbackResult>;
}
