import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './interface/controllers/recommendation.controller';
import { RecommendationResponseMapper } from './interface/mappers/recommendation-response.mapper';
import { RecommendationGuard } from './interface/guards/recommendation.guard';
import { TraceInterceptor } from './interface/interceptors/trace.interceptor';
import { ResponseInterceptor } from './interface/interceptors/response.interceptor';
import { HttpExceptionFilter } from './interface/filters/http-exception.filter';
import { TraceMiddleware } from './interface/middleware/trace.middleware';
import { RecommendationCommandService } from './application/services/recommendation-command.service';
import { RecommendationQueryService } from './application/services/recommendation-query.service';
import { RECOMMENDATION_REPOSITORY } from './application/contracts/recommendation-repository.contract';
import { EVENT_PUBLISHER } from './application/contracts/event-publisher.contract';
import { PrismaRecommendationRepository } from './infrastructure/persistence/repositories/prisma-recommendation.repository';
import { RecommendationOutboxPublisherService } from './infrastructure/events/recommendation-outbox-publisher.service';
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
import { RecommendationLockService } from '../../infrastructure/locks/recommendation-lock.service';

const RECOMMENDATION_LOCK_SERVICE = Symbol('RecommendationLockService');

@Module({
  imports: [OutboxModule, QueueModule, AuditModule, TelemetryModule, LocksModule],
  controllers: [RecommendationController],
  providers: [
    RecommendationService,
    RecommendationResponseMapper,
    RecommendationGuard,
    TraceInterceptor,
    ResponseInterceptor,
    HttpExceptionFilter,
    {
      provide: RECOMMENDATION_REPOSITORY,
      useClass: PrismaRecommendationRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (
        outbox: OutboxRepository,
        queue: QueueService,
        tracer: TracerService,
        metrics: MetricsService,
        auditLog: AuditLogService,
      ) => new RecommendationOutboxPublisherService(outbox, queue, tracer, metrics, auditLog),
      inject: [OutboxRepository, QueueService, TracerService, MetricsService, AuditLogService],
    },
    {
      provide: RECOMMENDATION_LOCK_SERVICE,
      useExisting: RecommendationLockService,
    },
    {
      provide: RecommendationCommandService,
      useFactory: (
        repository: any,
        eventPublisher: any,
        prisma: PrismaService,
        recommendationLock: any,
        metrics: MetricsService,
      ) =>
        new RecommendationCommandService(
          repository,
          eventPublisher,
          prisma,
          recommendationLock,
          metrics,
        ),
      inject: [
        RECOMMENDATION_REPOSITORY,
        EVENT_PUBLISHER,
        PrismaService,
        RECOMMENDATION_LOCK_SERVICE,
        MetricsService,
      ],
    },
    {
      provide: RecommendationQueryService,
      useFactory: (repository: any) => new RecommendationQueryService(repository),
      inject: [RECOMMENDATION_REPOSITORY],
    },
  ],
  exports: [RecommendationService, RecommendationCommandService, RecommendationQueryService],
})
export class RecommendationModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TraceMiddleware)
      .forRoutes({ path: 'recommendation*', method: RequestMethod.ALL });
  }
}
