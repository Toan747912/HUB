import { Injectable } from '@nestjs/common';
import {
  IMigrationValidator,
  ValidationIssue,
  ValidationResult,
} from '../../domain/contracts/migration.contracts';
import { MigrationJob } from '../../domain/entities/migration-job.entity';

@Injectable()
export class MigrationValidatorService implements IMigrationValidator {
  async validate(job: MigrationJob, _traceId: string): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    if (!job.steps.length) {
      issues.push({
        stepId: 'N/A',
        code: 'EMPTY_STEPS',
        message: 'Migration job must contain at least one step',
      });
    }

    const ids = new Set<string>();
    for (const step of job.steps) {
      if (ids.has(step.id)) {
        issues.push({
          stepId: step.id,
          code: 'DUPLICATE_STEP_ID',
          message: `Duplicate step id detected: ${step.id}`,
        });
      }
      ids.add(step.id);

      if (!step.sqlUpBatch.length) {
        issues.push({
          stepId: step.id,
          code: 'EMPTY_UP_BATCH',
          message: 'Up migration SQL batch cannot be empty',
        });
      }

      for (const dep of step.dependencies) {
        if (!job.steps.find((s) => s.id === dep)) {
          issues.push({
            stepId: step.id,
            code: 'MISSING_DEPENDENCY',
            message: `Dependency ${dep} not found`,
          });
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
