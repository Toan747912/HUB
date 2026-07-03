import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LearningSessionController } from './interface/controllers/learning-session.controller';
import { LearningSessionResponseMapper } from './interface/mappers/learning-session-response.mapper';
import { LearningSessionGuard } from './interface/guards/learning-session.guard';
import { TraceMiddleware } from './interface/middleware/trace.middleware';
import { LearningSessionCommandService } from './application/services/learning-session-command.service';
import { LearningSessionQueryService } from './application/services/learning-session-query.service';
import { LEARNING_SESSION_REPOSITORY } from './application/contracts/learning-session-repository.contract';
import { EVENT_PUBLISHER } from './application/contracts/event-publisher.contract';
import { LearningSessionSchema } from './infrastructure/persistence/schemas/learning-session.schema';
import { MongoLearningSessionRepository } from './infrastructure/persistence/repositories/mongo-learning-session.repository';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { OutboxPublisherService } from '../../infrastructure/outbox/outbox-publisher.service';
import { SecurityModule } from '../../infrastructure/security/security.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { MetricsService } from '../../infrastructure/observability/metrics.service';

import { LearningSessionService } from './learning-session.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'LearningSession', schema: LearningSessionSchema }]),
    OutboxModule,
    SecurityModule,
    TelemetryModule,
  ],
  controllers: [LearningSessionController],
  providers: [
    LearningSessionResponseMapper,
    LearningSessionGuard,
    LearningSessionService,
    {
      provide: LEARNING_SESSION_REPOSITORY,
      useClass: MongoLearningSessionRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useExisting: OutboxPublisherService,
    },
    {
      provide: LearningSessionCommandService,
      useFactory: (repository: any, eventPublisher: any, metrics: any) =>
        new LearningSessionCommandService(repository, eventPublisher, metrics),
      inject: [LEARNING_SESSION_REPOSITORY, EVENT_PUBLISHER, MetricsService],
    },
    {
      provide: LearningSessionQueryService,
      useFactory: (repository: any) => new LearningSessionQueryService(repository),
      inject: [LEARNING_SESSION_REPOSITORY],
    },
  ],
  exports: [LearningSessionCommandService, LearningSessionQueryService, LearningSessionService],
})
export class LearningSessionModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TraceMiddleware)
      .forRoutes({ path: 'learning-sessions*', method: RequestMethod.ALL });
  }
}
