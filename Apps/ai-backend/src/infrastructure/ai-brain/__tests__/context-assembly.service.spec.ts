import { AssessmentService } from '../../../modules/assessment/assessment.service';
import { DiscoveryService } from '../../../modules/discovery/discovery.service';
import { GoalService } from '../../../modules/goal/goal.service';
import { LearningSessionService } from '../../../modules/learning-session/learning-session.service';
import { RecommendationService } from '../../../modules/recommendation/recommendation.service';
import { RoadmapService } from '../../../modules/roadmap/roadmap.service';
import { ContextAssemblyService } from '../context-assembly.service';

describe('ContextAssemblyService', () => {
  it('assembles a BrainContext by reading only through the injected domain services', async () => {
    const goalService = { getGoal: jest.fn().mockResolvedValue({ id: 'goal-1', title: 'Title' }) };
    const roadmapService = {
      getRoadmapSlice: jest.fn().mockResolvedValue({ nodeId: 'node-1', status: 'ACTIVE' }),
    };
    const learningSessionService = {
      getSession: jest.fn().mockResolvedValue({ id: 'session-1', phase: 'ACTIVE' }),
    };
    const recommendationService = {
      getRecommendationState: jest.fn().mockResolvedValue({ state: 'priority-for-user-1' }),
    };
    const discoveryService = {
      getDiscoveryContext: jest.fn().mockResolvedValue({ profile: 'discovery-context-user-1' }),
    };
    const assessmentService = {
      getAssessmentHistory: jest.fn().mockResolvedValue({ refs: ['assessment-session-1-1'] }),
    };

    const service = new ContextAssemblyService(
      goalService as unknown as GoalService,
      roadmapService as unknown as RoadmapService,
      learningSessionService as unknown as LearningSessionService,
      recommendationService as unknown as RecommendationService,
      discoveryService as unknown as DiscoveryService,
      assessmentService as unknown as AssessmentService,
    );

    const context = await service.assemble({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-1',
    });

    expect(goalService.getGoal).toHaveBeenCalledWith('goal-1');
    expect(roadmapService.getRoadmapSlice).toHaveBeenCalledWith('goal-1');
    expect(learningSessionService.getSession).toHaveBeenCalledWith('session-1');
    expect(recommendationService.getRecommendationState).toHaveBeenCalledWith('user-1');
    expect(discoveryService.getDiscoveryContext).toHaveBeenCalledWith('user-1');
    expect(assessmentService.getAssessmentHistory).toHaveBeenCalledWith('session-1');

    expect(context).toMatchObject({
      userId: 'user-1',
      goalId: 'goal-1',
      sessionId: 'session-1',
      traceId: 'trace-1',
      goal: { id: 'goal-1', title: 'Title' },
      roadmap: { nodeId: 'node-1', status: 'ACTIVE' },
      session: { id: 'session-1', phase: 'ACTIVE' },
      recommendation: { state: 'priority-for-user-1' },
      discovery: { profile: 'discovery-context-user-1' },
      assessment: { refs: ['assessment-session-1-1'] },
    });
    expect(typeof context.assembledAt).toBe('string');
    expect(new Date(context.assembledAt).toString()).not.toBe('Invalid Date');
  });
});
