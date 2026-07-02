import { Injectable } from '@nestjs/common';
import { IMigrationLogRepository, IMigrationRepository, MigrationLogRecord } from '../../domain/contracts/migration-repository.contract';
import { MigrationJob } from '../../domain/entities/migration-job.entity';
import { MigrationState } from '../../domain/enums/migration-state.enum';
import { MigrationStep } from '../../domain/entities/migration-step.entity';

@Injectable()
export class InMemoryMigrationRepository implements IMigrationRepository {
  private readonly jobs = new Map<string, MigrationJob>();

  constructor() {
    const bootstrapJob = new MigrationJob('default-job', [
      new MigrationStep(
        'step-001',
        1,
        'create_table_example',
        'create base table for migration engine smoke test',
        ['CREATE TABLE IF NOT EXISTS migration_example(id INT PRIMARY KEY)'],
        ['DROP TABLE IF EXISTS migration_example'],
        []
      )
    ]);

    const smokeJob = new MigrationJob('job-1', [
      new MigrationStep(
        'step-001',
        1,
        'create_table_example',
        'create base table for migration engine smoke test',
        ['CREATE TABLE IF NOT EXISTS migration_example(id INT PRIMARY KEY)'],
        ['DROP TABLE IF EXISTS migration_example'],
        []
      )
    ]);

    this.jobs.set(bootstrapJob.jobId, bootstrapJob);
    this.jobs.set(smokeJob.jobId, smokeJob);
  }

  async findByJobId(jobId: string): Promise<MigrationJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async save(job: MigrationJob): Promise<void> {
    this.jobs.set(job.jobId, job);
  }

  async updateState(jobId: string, state: MigrationState): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    job.state = state;
    this.jobs.set(jobId, job);
  }
}

@Injectable()
export class InMemoryMigrationLogRepository implements IMigrationLogRepository {
  private readonly records: MigrationLogRecord[] = [];

  async log(record: MigrationLogRecord): Promise<void> {
    this.records.push(record);
  }
}
