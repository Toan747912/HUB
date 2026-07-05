import { Module } from '@nestjs/common';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { LifecycleEventsService } from './application/lifecycle-events.service';
import { LifecycleRegistryService } from './application/lifecycle-registry.service';
import { LifecycleRetentionService } from './application/lifecycle-retention.service';
import { LifecycleService } from './application/lifecycle.service';
import { LIFECYCLE_REPOSITORY } from './domain/lifecycle.types';
import { PrismaAgentInstanceRepository } from './repositories/prisma-agent-instance.repository';

@Module({
  imports: [TelemetryModule, AuditModule],
  providers: [
    { provide: LIFECYCLE_REPOSITORY, useClass: PrismaAgentInstanceRepository },
    LifecycleRegistryService,
    LifecycleEventsService,
    LifecycleService,
    LifecycleRetentionService,
  ],
  exports: [LifecycleService],
})
export class AgentLifecycleModule {}
