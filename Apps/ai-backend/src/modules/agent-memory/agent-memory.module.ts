import { Module } from '@nestjs/common';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { MemoryGarbageCollectorService } from './application/memory-garbage-collector.service';
import { MemoryQueryService } from './application/memory-query.service';
import { MemoryStoreService } from './application/memory-store.service';
import { MEMORY_REPOSITORY } from './domain/memory.types';
import { PrismaMemoryRepository } from './repositories/prisma-memory.repository';

@Module({
  imports: [TelemetryModule, AuditModule],
  providers: [
    { provide: MEMORY_REPOSITORY, useClass: PrismaMemoryRepository },
    MemoryStoreService,
    MemoryQueryService,
    MemoryGarbageCollectorService,
  ],
  exports: [MemoryStoreService, MemoryQueryService, MemoryGarbageCollectorService],
})
export class AgentMemoryModule {}
