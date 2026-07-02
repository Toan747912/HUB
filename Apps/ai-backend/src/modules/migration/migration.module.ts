import { Module } from '@nestjs/common';
import { MigrationExecutorService } from './application/services/migration-executor.service';
import { MigrationValidatorService } from './application/services/migration-validator.service';
import { RollbackService } from './application/services/rollback.service';
import { InMemoryMigrationLogRepository, InMemoryMigrationRepository } from './infrastructure/repositories/in-memory-migration.repository';
import { CircuitBreakerService } from './infrastructure/resilience/circuit-breaker.service';
import { SqlExecutorService } from './infrastructure/sql/sql-executor.service';
import { MIGRATION_LOG_REPOSITORY, MIGRATION_REPOSITORY } from './infrastructure/tokens/migration.tokens';
import { MigrationController } from './interfaces/migration.controller';
import { MigrationPipeline } from './orchestration/migration-pipeline.service';
import { StructuredLoggerService } from './infrastructure/logging/structured-logger.service';

@Module({
  controllers: [MigrationController],
  providers: [
    SqlExecutorService,
    CircuitBreakerService,
    StructuredLoggerService,
    MigrationValidatorService,
    MigrationExecutorService,
    RollbackService,
    MigrationPipeline,
    {
      provide: MIGRATION_REPOSITORY,
      useClass: InMemoryMigrationRepository
    },
    {
      provide: MIGRATION_LOG_REPOSITORY,
      useClass: InMemoryMigrationLogRepository
    }
  ],
  exports: [MigrationPipeline]
})
export class MigrationModule {}
