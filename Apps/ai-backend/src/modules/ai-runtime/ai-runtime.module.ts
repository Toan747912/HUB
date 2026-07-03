import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../../infrastructure/infrastructure.module';
import { SharedModule } from '../../shared/shared.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { GoalModule } from '../goal/goal.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { LearningSessionModule } from '../learning-session/learning-session.module';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { RoadmapModule } from '../roadmap/roadmap.module';
import { TeachingModule } from '../teaching/teaching.module';
import { AiRuntimeController } from './ai-runtime.controller';
import { AiRuntimeService } from './ai-runtime.service';

@Module({
  imports: [
    InfrastructureModule,
    SharedModule,
    GoalModule,
    RoadmapModule,
    LearningSessionModule,
    KnowledgeModule,
    EvidenceModule,
    AssessmentModule,
    RecommendationModule,
    DiscoveryModule,
    TeachingModule,
  ],
  controllers: [AiRuntimeController],
  providers: [AiRuntimeService],
})
export class AiRuntimeModule {}
