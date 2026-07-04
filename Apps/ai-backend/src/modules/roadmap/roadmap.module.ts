import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { RoadmapService } from './roadmap.service';
import { RoadmapController } from './interface/controllers/roadmap.controller';
import { RoadmapResponseMapper } from './interface/mappers/roadmap-response.mapper';
import { RoadmapGuard } from './interface/guards/roadmap.guard';
import { TraceInterceptor } from './interface/interceptors/trace.interceptor';
import { ResponseInterceptor } from './interface/interceptors/response.interceptor';
import { HttpExceptionFilter } from './interface/filters/http-exception.filter';
import { TraceMiddleware } from './interface/middleware/trace.middleware';
import { RoadmapCommandService } from './application/services/roadmap-command.service';
import { RoadmapQueryService } from './application/services/roadmap-query.service';
import { ROADMAP_REPOSITORY } from './application/contracts/roadmap-repository.contract';
import { EVENT_PUBLISHER } from './application/contracts/event-publisher.contract';
import { RoadmapSchema } from './infrastructure/persistence/schemas/roadmap.schema';
import { MongoRoadmapRepository } from './infrastructure/persistence/repositories/mongo-roadmap.repository';
import { RoadmapOutboxPublisherService } from './infrastructure/events/roadmap-outbox-publisher.service';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { OutboxRepository } from '../../infrastructure/outbox/outbox.repository';
import { QueueModule } from '../../infrastructure/jobs/queue.module';
import { QueueService } from '../../infrastructure/jobs/queue.service';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { AuditLogService } from '../../infrastructure/audit/audit-log.service';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { TracerService } from '../../infrastructure/observability/tracer.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';
import { LocksModule } from '../../infrastructure/locks/locks.module';
import { RoadmapLockService } from '../../infrastructure/locks/roadmap-lock.service';
import { SkillModule } from '../skill/skill.module';
import { SkillCatalogService } from '../skill/application/services/skill-catalog.service';

const ROADMAP_LOCK_SERVICE = Symbol('RoadmapLockService');

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Roadmap', schema: RoadmapSchema }]),
    OutboxModule,
    QueueModule,
    AuditModule,
    TelemetryModule,
    LocksModule,
    SkillModule,
  ],
  controllers: [RoadmapController],
  providers: [
    RoadmapService,
    RoadmapResponseMapper,
    RoadmapGuard,
    TraceInterceptor,
    ResponseInterceptor,
    HttpExceptionFilter,
    {
      provide: ROADMAP_REPOSITORY,
      useClass: MongoRoadmapRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (
        outbox: OutboxRepository,
        queue: QueueService,
        tracer: TracerService,
        metrics: MetricsService,
        auditLog: AuditLogService,
      ) => new RoadmapOutboxPublisherService(outbox, queue, tracer, metrics, auditLog),
      inject: [OutboxRepository, QueueService, TracerService, MetricsService, AuditLogService],
    },
    {
      provide: ROADMAP_LOCK_SERVICE,
      useExisting: RoadmapLockService,
    },
    {
      provide: RoadmapCommandService,
      useFactory: (
        repository: any,
        eventPublisher: any,
        skillCatalog: SkillCatalogService,
        connection: any,
        roadmapLock: any,
        metrics: MetricsService,
      ) =>
        new RoadmapCommandService(
          repository,
          eventPublisher,
          skillCatalog,
          connection,
          roadmapLock,
          metrics,
        ),
      inject: [
        ROADMAP_REPOSITORY,
        EVENT_PUBLISHER,
        SkillCatalogService,
        getConnectionToken(),
        ROADMAP_LOCK_SERVICE,
        MetricsService,
      ],
    },
    {
      provide: RoadmapQueryService,
      useFactory: (repository: any) => new RoadmapQueryService(repository),
      inject: [ROADMAP_REPOSITORY],
    },
  ],
  exports: [RoadmapService, RoadmapCommandService, RoadmapQueryService],
})
export class RoadmapModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceMiddleware).forRoutes({ path: 'roadmap*', method: RequestMethod.ALL });
  }
}
