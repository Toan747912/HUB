import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './infrastructure/security/jwt-auth.guard';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { QueueModule } from './infrastructure/jobs/queue.module';
import { ResilienceModule } from './infrastructure/resilience/resilience.module';
import { OutboxModule } from './infrastructure/outbox/outbox.module';
import { LocksModule } from './infrastructure/locks/locks.module';
import { TelemetryModule } from './infrastructure/observability/telemetry.module';
import { AuditModule } from './infrastructure/audit/audit.module';
import { SecurityModule } from './infrastructure/security/security.module';
import { AiRuntimeModule } from './modules/ai-runtime/ai-runtime.module';
import { MigrationModule } from './modules/migration/migration.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { TeachingModule } from './modules/teaching/teaching.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { GoalModule } from './modules/goal/goal.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';
import { OrchestrationModule } from './modules/orchestration/orchestration.module';
import { LearningSessionModule } from './modules/learning-session/learning-session.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { SharedModule } from './shared/shared.module';
import { getDatabaseName, getDatabaseUri } from './modules/goal/infrastructure/persistence/config/database.config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: getDatabaseUri(),
        dbName: getDatabaseName(),
        connectionFactory: (connection: any) => {
          connection.on('connected', () =>
            console.log(JSON.stringify({ event: 'db_connected', database: 'mongodb', timestamp: new Date().toISOString() }))
          );
          connection.on('error', (err: Error) =>
            console.error(JSON.stringify({ event: 'db_error', database: 'mongodb', error: err.message, timestamp: new Date().toISOString() }))
          );
          connection.on('disconnected', () =>
            console.warn(JSON.stringify({ event: 'db_disconnected', database: 'mongodb', timestamp: new Date().toISOString() }))
          );
          return connection;
        }
      })
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 30
      }
    ]),
    ScheduleModule.forRoot(),
    TelemetryModule,
    AuditModule,
    SecurityModule,
    RedisModule,
    ResilienceModule,
    QueueModule,
    OutboxModule,
    LocksModule,
    HealthModule,
    InfrastructureModule,
    SharedModule,
    GoalModule,
    RoadmapModule,
    LearningSessionModule,
    KnowledgeModule,
    EvidenceModule,
    AssessmentModule,
    RecommendationModule,
    OrchestrationModule,
    DiscoveryModule,
    TeachingModule,
    AiRuntimeModule,
    MigrationModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }
  ]
})
export class AppModule {}
