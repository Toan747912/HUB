import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { PrismaSkillRepository } from './infrastructure/persistence/repositories/prisma-skill.repository';
import { SKILL_REPOSITORY } from './application/contracts/skill-repository.contract';
import { EVENT_PUBLISHER } from './application/contracts/event-publisher.contract';
import { SkillCatalogService } from './application/services/skill-catalog.service';
import { SkillOutboxPublisherService } from './infrastructure/events/skill-outbox-publisher.service';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { OutboxRepository } from '../../infrastructure/outbox/outbox.repository';
import { QueueModule } from '../../infrastructure/jobs/queue.module';
import { QueueService } from '../../infrastructure/jobs/queue.service';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { AuditLogService } from '../../infrastructure/audit/audit-log.service';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { TracerService } from '../../infrastructure/observability/tracer.service';

@Module({
  imports: [OutboxModule, QueueModule, AuditModule, TelemetryModule],
  providers: [
    {
      provide: SKILL_REPOSITORY,
      useClass: PrismaSkillRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (
        outbox: OutboxRepository,
        queue: QueueService,
        tracer: TracerService,
        auditLog: AuditLogService,
      ) => new SkillOutboxPublisherService(outbox, queue, tracer, auditLog),
      inject: [OutboxRepository, QueueService, TracerService, AuditLogService],
    },
    {
      provide: SkillCatalogService,
      useFactory: (repository: any, eventPublisher: any, prisma: PrismaService) =>
        new SkillCatalogService(repository, eventPublisher, prisma),
      inject: [SKILL_REPOSITORY, EVENT_PUBLISHER, PrismaService],
    },
  ],
  exports: [SkillCatalogService],
})
export class SkillModule {}
