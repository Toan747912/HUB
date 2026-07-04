import { Module } from '@nestjs/common';
import { DiscoveryModule } from '../../modules/discovery/discovery.module';
import { GoalModule } from '../../modules/goal/goal.module';
import { LearningSessionModule } from '../../modules/learning-session/learning-session.module';
import { RecommendationModule } from '../../modules/recommendation/recommendation.module';
import { RoadmapModule } from '../../modules/roadmap/roadmap.module';
import { InfrastructureModule } from '../infrastructure.module';
import { ResilienceModule } from '../resilience/resilience.module';
import { ContextAssemblyService } from './context-assembly.service';
import { ResilientLlmGateway } from './resilient-llm-gateway.service';

@Module({
  imports: [
    InfrastructureModule,
    ResilienceModule,
    GoalModule,
    RoadmapModule,
    LearningSessionModule,
    RecommendationModule,
    DiscoveryModule,
  ],
  providers: [ContextAssemblyService, ResilientLlmGateway],
  exports: [ContextAssemblyService, ResilientLlmGateway],
})
export class AiBrainModule {}
