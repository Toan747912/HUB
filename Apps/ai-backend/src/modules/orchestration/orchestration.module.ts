import { Module } from '@nestjs/common';
import { QueueModule } from '../../infrastructure/jobs/queue.module';
import { RoadmapModule } from '../roadmap/roadmap.module';
import { AssessmentModule } from '../assessment/assessment.module';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { OrchestrationWorkerService } from './application/orchestration-worker.service';

/**
 * WP-06C Workstream F: platform orchestration. Purely event-driven —
 * imports the three downstream modules only to reach their exported
 * application-layer command/query services (never an aggregate or
 * repository), and reacts to relayed domain events via QueueService rather
 * than any direct call from Goal/Roadmap/Assessment into this module.
 */
@Module({
  imports: [QueueModule, RoadmapModule, AssessmentModule, RecommendationModule],
  providers: [OrchestrationWorkerService],
  exports: [OrchestrationWorkerService]
})
export class OrchestrationModule {}
