import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/persistence/prisma.service';
import { GoalService } from './goal.service';
import { GoalController } from './interface/controllers/goal.controller';
import { GoalResponseMapper } from './interface/mappers/goal-response.mapper';
import { GoalGuard } from './interface/guards/goal.guard';
import { TraceInterceptor } from './interface/interceptors/trace.interceptor';
import { ResponseInterceptor } from './interface/interceptors/response.interceptor';
import { HttpExceptionFilter } from './interface/filters/http-exception.filter';
import { TraceMiddleware } from './interface/middleware/trace.middleware';
import { GoalCommandService } from './application/services/goal-command.service';
import { GoalQueryService } from './application/services/goal-query.service';
import { GOAL_REPOSITORY } from './application/contracts/goal-repository.contract';
import { EVENT_PUBLISHER } from './application/contracts/event-publisher.contract';
import { PrismaGoalRepository } from './infrastructure/persistence/repositories/prisma-goal.repository';
import { OutboxModule } from '../../infrastructure/outbox/outbox.module';
import { OutboxPublisherService } from '../../infrastructure/outbox/outbox-publisher.service';
import { LocksModule } from '../../infrastructure/locks/locks.module';
import { GoalLockService } from '../../infrastructure/locks/goal-lock.service';

const GOAL_LOCK_SERVICE = Symbol('GoalLockService');

@Module({
  imports: [OutboxModule, LocksModule],
  controllers: [GoalController],
  providers: [
    GoalService,
    GoalResponseMapper,
    GoalGuard,
    TraceInterceptor,
    ResponseInterceptor,
    HttpExceptionFilter,
    {
      provide: GOAL_REPOSITORY,
      useClass: PrismaGoalRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useExisting: OutboxPublisherService,
    },
    {
      provide: GOAL_LOCK_SERVICE,
      useExisting: GoalLockService,
    },
    {
      provide: GoalCommandService,
      useFactory: (repository: any, eventPublisher: any, prisma: PrismaService, goalLock: any) =>
        new GoalCommandService(repository, eventPublisher, prisma, goalLock),
      inject: [GOAL_REPOSITORY, EVENT_PUBLISHER, PrismaService, GOAL_LOCK_SERVICE],
    },
    {
      provide: GoalQueryService,
      useFactory: (repository: any) => new GoalQueryService(repository),
      inject: [GOAL_REPOSITORY],
    },
  ],
  exports: [GoalService, GoalCommandService, GoalQueryService],
})
export class GoalModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceMiddleware).forRoutes({ path: 'goal*', method: RequestMethod.ALL });
  }
}
