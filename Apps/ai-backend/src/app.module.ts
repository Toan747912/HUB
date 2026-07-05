import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './infrastructure/security/jwt-auth.guard';
import { PrismaModule } from './infrastructure/persistence/prisma.module';
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
import { AgentCoreModule } from './modules/agent-core/agent-core.module';
import { AgentToolsModule } from './modules/agent-tools/agent-tools.module';
import { AgentLifecycleModule } from './modules/agent-lifecycle/agent-lifecycle.module';
import { AgentRuntimeModule } from './modules/agent-runtime/agent-runtime.module';
import { AgentMessageBusModule } from './modules/agent-message-bus/agent-message-bus.module';
import { AgentCoordinatorModule } from './modules/agent-coordinator/agent-coordinator.module';
import { AgentCollaborationModule } from './modules/agent-collaboration/agent-collaboration.module';
import { AgentLearningModule } from './modules/agent-learning/agent-learning.module';
import { MissionPlannerModule } from './modules/mission-planner/mission-planner.module';
import { DiscoveryPlannerModule } from './modules/discovery-planner/discovery-planner.module';
import { KnowledgePlannerModule } from './modules/knowledge-planner/knowledge-planner.module';
import { EvidencePlannerModule } from './modules/evidence-planner/evidence-planner.module';
import { TeachingPlannerModule } from './modules/teaching-planner/teaching-planner.module';
import { MigrationModule } from './modules/migration/migration.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { TeachingModule } from './modules/teaching/teaching.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { GoalModule } from './modules/goal/goal.module';
import { SkillModule } from './modules/skill/skill.module';
import { RoadmapModule } from './modules/roadmap/roadmap.module';
import { OrchestrationModule } from './modules/orchestration/orchestration.module';
import { LearningSessionModule } from './modules/learning-session/learning-session.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 30,
      },
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
    SkillModule,
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
    AgentCoreModule,
    AgentToolsModule,
    AgentLifecycleModule,
    AgentRuntimeModule,
    AgentMessageBusModule,
    MissionPlannerModule,
    DiscoveryPlannerModule,
    KnowledgePlannerModule,
    EvidencePlannerModule,
    TeachingPlannerModule,
    AgentCoordinatorModule,
    AgentCollaborationModule,
    AgentLearningModule,
    MigrationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
