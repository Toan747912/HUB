import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './interface/controllers/assessment.controller';
import { AssessmentResponseMapper } from './interface/mappers/assessment-response.mapper';
import { AssessmentGuard } from './interface/guards/assessment.guard';
import { TraceInterceptor } from './interface/interceptors/trace.interceptor';
import { ResponseInterceptor } from './interface/interceptors/response.interceptor';
import { HttpExceptionFilter } from './interface/filters/http-exception.filter';
import { TraceMiddleware } from './interface/middleware/trace.middleware';
import { AssessmentCommandService } from './application/services/assessment-command.service';
import { AssessmentQueryService } from './application/services/assessment-query.service';
import { ASSESSMENT_REPOSITORY } from './application/contracts/assessment-repository.contract';
import { EVENT_PUBLISHER } from './application/contracts/event-publisher.contract';
import { AssessmentSchema } from './infrastructure/persistence/schemas/assessment.schema';
import { MongoAssessmentRepository } from './infrastructure/persistence/repositories/mongo-assessment.repository';
import { AssessmentOutboxPublisherService } from './infrastructure/events/assessment-outbox-publisher.service';
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
import { AssessmentLockService } from '../../infrastructure/locks/assessment-lock.service';

const ASSESSMENT_LOCK_SERVICE = Symbol('AssessmentLockService');

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Assessment', schema: AssessmentSchema }]),
    OutboxModule,
    QueueModule,
    AuditModule,
    TelemetryModule,
    LocksModule,
  ],
  controllers: [AssessmentController],
  providers: [
    AssessmentService,
    AssessmentResponseMapper,
    AssessmentGuard,
    TraceInterceptor,
    ResponseInterceptor,
    HttpExceptionFilter,
    {
      provide: ASSESSMENT_REPOSITORY,
      useClass: MongoAssessmentRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (
        outbox: OutboxRepository,
        queue: QueueService,
        tracer: TracerService,
        metrics: MetricsService,
        auditLog: AuditLogService,
      ) => new AssessmentOutboxPublisherService(outbox, queue, tracer, metrics, auditLog),
      inject: [OutboxRepository, QueueService, TracerService, MetricsService, AuditLogService],
    },
    {
      provide: ASSESSMENT_LOCK_SERVICE,
      useExisting: AssessmentLockService,
    },
    {
      provide: AssessmentCommandService,
      useFactory: (
        repository: any,
        eventPublisher: any,
        connection: any,
        assessmentLock: any,
        metrics: MetricsService,
      ) =>
        new AssessmentCommandService(repository, eventPublisher, connection, assessmentLock, metrics),
      inject: [
        ASSESSMENT_REPOSITORY,
        EVENT_PUBLISHER,
        getConnectionToken(),
        ASSESSMENT_LOCK_SERVICE,
        MetricsService,
      ],
    },
    {
      provide: AssessmentQueryService,
      useFactory: (repository: any) => new AssessmentQueryService(repository),
      inject: [ASSESSMENT_REPOSITORY],
    },
  ],
  exports: [AssessmentService, AssessmentCommandService, AssessmentQueryService],
})
export class AssessmentModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceMiddleware).forRoutes({ path: 'assessment*', method: RequestMethod.ALL });
  }
}
