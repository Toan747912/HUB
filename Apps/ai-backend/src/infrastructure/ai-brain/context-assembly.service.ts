import { Injectable } from '@nestjs/common';
import { AssessmentService } from '../../modules/assessment/assessment.service';
import { DiscoveryService } from '../../modules/discovery/discovery.service';
import { GoalService } from '../../modules/goal/goal.service';
import { LearningSessionService } from '../../modules/learning-session/learning-session.service';
import { RecommendationService } from '../../modules/recommendation/recommendation.service';
import { RoadmapService } from '../../modules/roadmap/roadmap.service';
import { BrainContext, BrainContextRequest } from './brain-context.types';

/**
 * Single read-only entry point into cross-domain context. AI capabilities must
 * depend on this service instead of injecting per-domain services directly, so
 * domain module boundaries stay enforced at the capability layer.
 */
@Injectable()
export class ContextAssemblyService {
  constructor(
    private readonly goalService: GoalService,
    private readonly roadmapService: RoadmapService,
    private readonly learningSessionService: LearningSessionService,
    private readonly recommendationService: RecommendationService,
    private readonly discoveryService: DiscoveryService,
    private readonly assessmentService: AssessmentService,
  ) {}

  async assemble(request: BrainContextRequest): Promise<BrainContext> {
    const [goal, roadmap, session, recommendation, discovery, assessment] = await Promise.all([
      this.goalService.getGoal(request.goalId),
      this.roadmapService.getRoadmapSlice(request.goalId),
      this.learningSessionService.getSession(request.sessionId),
      this.recommendationService.getRecommendationState(request.userId),
      this.discoveryService.getDiscoveryContext(request.userId),
      this.assessmentService.getAssessmentHistory(request.sessionId),
    ]);

    return {
      userId: request.userId,
      goalId: request.goalId,
      sessionId: request.sessionId,
      traceId: request.traceId,
      goal,
      roadmap,
      session,
      recommendation,
      discovery,
      assessment,
      assembledAt: new Date().toISOString(),
    };
  }
}
