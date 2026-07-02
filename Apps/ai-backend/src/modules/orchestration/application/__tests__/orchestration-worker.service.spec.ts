import { AssessmentId, GoalId, RecommendationId, RoadmapId } from '../../../../shared/domain/identifiers';
import { DomainEvent } from '../../../../infrastructure/outbox/domain-event.contract';
import { QueueService } from '../../../../infrastructure/jobs/queue.service';
import { RoadmapCommandService } from '../../../roadmap/application/services/roadmap-command.service';
import { RoadmapQueryService } from '../../../roadmap/application/services/roadmap-query.service';
import { AssessmentCommandService } from '../../../assessment/application/services/assessment-command.service';
import { AssessmentQueryService } from '../../../assessment/application/services/assessment-query.service';
import { RecommendationCommandService } from '../../../recommendation/application/services/recommendation-command.service';
import { RecommendationQueryService } from '../../../recommendation/application/services/recommendation-query.service';
import { InvalidateRoadmapCommand } from '../../../roadmap/application/commands/invalidate-roadmap.command';
import { InvalidateAssessmentCommand } from '../../../assessment/application/commands/invalidate-assessment.command';
import { InvalidateRecommendationCommand } from '../../../recommendation/application/commands/invalidate-recommendation.command';
import { OrchestrationWorkerService } from '../orchestration-worker.service';

const makeEvent = (type: string, aggregateId: { toString(): string }, overrides: Partial<DomainEvent> = {}): DomainEvent => ({
  type,
  metadata: {
    eventId: `evt-${type}`,
    aggregateId: aggregateId as any,
    aggregateType: 'Whatever',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    traceId: 'trace-1',
    correlationId: 'corr-1',
    causationId: 'cause-1'
  },
  payload: {},
  ...overrides
});

describe('OrchestrationWorkerService — event-driven staleness propagation', () => {
  let queue: jest.Mocked<QueueService>;
  let roadmapCommandService: jest.Mocked<RoadmapCommandService>;
  let roadmapQueryService: jest.Mocked<RoadmapQueryService>;
  let assessmentCommandService: jest.Mocked<AssessmentCommandService>;
  let assessmentQueryService: jest.Mocked<AssessmentQueryService>;
  let recommendationCommandService: jest.Mocked<RecommendationCommandService>;
  let recommendationQueryService: jest.Mocked<RecommendationQueryService>;
  let service: OrchestrationWorkerService;

  const goalId = GoalId.create('goal-1');
  const roadmapId = RoadmapId.create('roadmap-1');
  const assessmentId = AssessmentId.create('assessment-1');
  const recommendationId = RecommendationId.create('recommendation-1');

  beforeEach(() => {
    queue = { registerHandler: jest.fn() } as any;

    roadmapCommandService = { invalidateRoadmap: jest.fn().mockResolvedValue(undefined) } as any;
    roadmapQueryService = {
      getRoadmapsByGoalId: jest.fn().mockResolvedValue([{ getId: () => roadmapId }])
    } as any;

    assessmentCommandService = { invalidateAssessment: jest.fn().mockResolvedValue(undefined) } as any;
    assessmentQueryService = {
      getAssessmentsByRoadmapId: jest.fn().mockResolvedValue([{ getId: () => assessmentId }])
    } as any;

    recommendationCommandService = { invalidateRecommendation: jest.fn().mockResolvedValue(undefined) } as any;
    recommendationQueryService = {
      getRecommendationsByAssessmentId: jest.fn().mockResolvedValue([{ getId: () => recommendationId }])
    } as any;

    service = new OrchestrationWorkerService(
      queue,
      roadmapCommandService,
      roadmapQueryService,
      assessmentCommandService,
      assessmentQueryService,
      recommendationCommandService,
      recommendationQueryService
    );
  });

  it('registers itself as a QueueService handler on module init (no second BullMQ Worker)', () => {
    service.onModuleInit();
    expect(queue.registerHandler).toHaveBeenCalledTimes(1);
    expect(queue.registerHandler).toHaveBeenCalledWith(expect.any(Function));
  });

  it('GoalCompleted -> invalidates every Roadmap whose goalId matches', async () => {
    const event = makeEvent('GoalCompleted', goalId);

    await service.handleEvent(event);

    expect(roadmapQueryService.getRoadmapsByGoalId).toHaveBeenCalledWith(
      expect.objectContaining({ goalId: 'goal-1' })
    );
    expect(roadmapCommandService.invalidateRoadmap).toHaveBeenCalledTimes(1);
    const command = roadmapCommandService.invalidateRoadmap.mock.calls[0][0] as InvalidateRoadmapCommand;
    expect(command.roadmapId).toBe('roadmap-1');
    expect(command.reason).toContain('GoalCompleted');
    expect(command.traceId).toBe('trace-1');
    expect(command.causationId).toBe('evt-GoalCompleted');

    // Only the Goal -> Roadmap step should fire for a Goal event.
    expect(assessmentCommandService.invalidateAssessment).not.toHaveBeenCalled();
    expect(recommendationCommandService.invalidateRecommendation).not.toHaveBeenCalled();
  });

  it('RoadmapUpdated -> invalidates every Assessment whose roadmapId matches', async () => {
    const event = makeEvent('RoadmapUpdated', roadmapId);

    await service.handleEvent(event);

    expect(assessmentQueryService.getAssessmentsByRoadmapId).toHaveBeenCalledWith(
      expect.objectContaining({ roadmapId: 'roadmap-1' })
    );
    expect(assessmentCommandService.invalidateAssessment).toHaveBeenCalledTimes(1);
    const command = assessmentCommandService.invalidateAssessment.mock.calls[0][0] as InvalidateAssessmentCommand;
    expect(command.assessmentId).toBe('assessment-1');
    expect(command.reason).toContain('RoadmapUpdated');

    expect(roadmapCommandService.invalidateRoadmap).not.toHaveBeenCalled();
    expect(recommendationCommandService.invalidateRecommendation).not.toHaveBeenCalled();
  });

  it('AssessmentCompleted -> invalidates every Recommendation whose assessmentId matches', async () => {
    const event = makeEvent('AssessmentCompleted', assessmentId);

    await service.handleEvent(event);

    expect(recommendationQueryService.getRecommendationsByAssessmentId).toHaveBeenCalledWith(
      expect.objectContaining({ assessmentId: 'assessment-1' })
    );
    expect(recommendationCommandService.invalidateRecommendation).toHaveBeenCalledTimes(1);
    const command = recommendationCommandService.invalidateRecommendation.mock.calls[0][0] as InvalidateRecommendationCommand;
    expect(command.recommendationId).toBe('recommendation-1');
    expect(command.reason).toContain('AssessmentCompleted');

    expect(roadmapCommandService.invalidateRoadmap).not.toHaveBeenCalled();
    expect(assessmentCommandService.invalidateAssessment).not.toHaveBeenCalled();
  });

  it('drives the full Goal -> Roadmap -> Assessment -> Recommendation chain in order', async () => {
    const callOrder: string[] = [];
    roadmapCommandService.invalidateRoadmap.mockImplementation(async () => {
      callOrder.push('roadmap');
      return undefined as any;
    });
    assessmentCommandService.invalidateAssessment.mockImplementation(async () => {
      callOrder.push('assessment');
      return undefined as any;
    });
    recommendationCommandService.invalidateRecommendation.mockImplementation(async () => {
      callOrder.push('recommendation');
      return undefined as any;
    });

    // A Goal transition (e.g. GoalUpdated/GoalCompleted, as fired by
    // GoalCommandService) relays onto the queue and reaches this handler.
    await service.handleEvent(makeEvent('GoalCompleted', goalId));
    // The RoadmapInvalidated event that invalidateRoadmap's own aggregate
    // method would then emit relays back through the same queue.
    await service.handleEvent(makeEvent('RoadmapInvalidated', roadmapId));
    // Likewise AssessmentInvalidated cascades to Recommendation.
    await service.handleEvent(makeEvent('AssessmentInvalidated', assessmentId));

    expect(callOrder).toEqual(['roadmap', 'assessment', 'recommendation']);
  });

  it('ignores event types with no orchestration meaning (e.g. its own downstream output is not re-triggered)', async () => {
    await service.handleEvent(makeEvent('RecommendationInvalidated', recommendationId));
    await service.handleEvent(makeEvent('GoalConstraintChanged', goalId));

    expect(roadmapCommandService.invalidateRoadmap).not.toHaveBeenCalled();
    expect(assessmentCommandService.invalidateAssessment).not.toHaveBeenCalled();
    expect(recommendationCommandService.invalidateRecommendation).not.toHaveBeenCalled();
  });

  it('one failed downstream invalidation does not block invalidating the remaining matches', async () => {
    roadmapQueryService.getRoadmapsByGoalId.mockResolvedValue([
      { getId: () => RoadmapId.create('roadmap-fail') },
      { getId: () => roadmapId }
    ] as any);
    roadmapCommandService.invalidateRoadmap.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined as any);

    await service.handleEvent(makeEvent('GoalCompleted', goalId));

    expect(roadmapCommandService.invalidateRoadmap).toHaveBeenCalledTimes(2);
  });
});
