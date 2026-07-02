import { Module } from '@nestjs/common';
import { RedisModule } from '../cache/redis.module';
import { GoalLockService } from './goal-lock.service';
import { RoadmapLockService } from './roadmap-lock.service';
import { AssessmentLockService } from './assessment-lock.service';
import { RecommendationLockService } from './recommendation-lock.service';

@Module({
  imports: [RedisModule],
  providers: [GoalLockService, RoadmapLockService, AssessmentLockService, RecommendationLockService],
  exports: [GoalLockService, RoadmapLockService, AssessmentLockService, RecommendationLockService]
})
export class LocksModule {}
