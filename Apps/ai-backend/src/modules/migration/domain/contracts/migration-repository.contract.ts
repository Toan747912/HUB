import { MigrationJob } from '../entities/migration-job.entity';
import { MigrationState } from '../enums/migration-state.enum';

export type MigrationLogRecord = {
  traceId: string;
  jobId: string;
  step: string;
  latencyMs: number;
  status: 'SUCCESS' | 'FAILED';
  errorType?: string;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
};

export interface IMigrationRepository {
  findByJobId(jobId: string): Promise<MigrationJob | null>;
  save(job: MigrationJob): Promise<void>;
  updateState(jobId: string, state: MigrationState): Promise<void>;
}

export interface IMigrationLogRepository {
  log(record: MigrationLogRecord): Promise<void>;
}
