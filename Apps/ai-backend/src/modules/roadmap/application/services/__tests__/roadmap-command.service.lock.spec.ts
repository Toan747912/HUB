import { Roadmap } from '../../../domain/aggregates/roadmap.aggregate';
import { RoadmapPlanningEngine } from '../../../domain/engine/roadmap-planning.engine';
import { PlanningInput } from '../../../domain/engine/roadmap-planning.types';
import { IRoadmapRepository } from '../../contracts/roadmap-repository.contract';
import { IEventPublisher } from '../../contracts/event-publisher.contract';
import { PublishRoadmapCommand } from '../../commands/publish-roadmap.command';
import { CreateRoadmapCommand } from '../../commands/create-roadmap.command';
import { RoadmapNotFoundError, RoadmapStateTransitionError } from '../../errors/application.errors';
import { IRoadmapLock, RoadmapCommandService } from '../roadmap-command.service';

const engine = new RoadmapPlanningEngine();

const goalSnapshot: PlanningInput = {
  goalId: 'goal-1',
  learnerId: 'learner-1',
  title: 'Master TypeScript',
  description: 'Deep TS knowledge',
  goalType: 'SKILL',
  difficulty: 'INTERMEDIATE',
  priority: 'HIGH',
  constraints: [],
  targetDate: '2027-01-01'
};

const makeRoadmap = (): Roadmap => {
  const plan = engine.generate(goalSnapshot);
  return Roadmap.create(
    { roadmapId: 'roadmap-lock-1', goalId: goalSnapshot.goalId, learnerId: goalSnapshot.learnerId, goalSnapshot, plan },
    { traceId: 't', correlationId: 'c', causationId: 'ca' }
  );
};

describe('RoadmapCommandService — distributed lock wiring', () => {
  let repository: jest.Mocked<IRoadmapRepository>;
  let eventPublisher: jest.Mocked<IEventPublisher>;
  let roadmapLock: jest.Mocked<IRoadmapLock>;
  let service: RoadmapCommandService;

  beforeEach(() => {
    repository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn()
    } as any;
    eventPublisher = { publish: jest.fn(), publishMany: jest.fn().mockResolvedValue(undefined) };
    roadmapLock = { lock: jest.fn().mockResolvedValue({ token: 'tok' }), unlock: jest.fn().mockResolvedValue(undefined) };
    service = new RoadmapCommandService(repository, eventPublisher, roadmapLock);
  });

  it('acquires and releases the lock around publishRoadmap', async () => {
    const roadmap = makeRoadmap();
    repository.findById.mockResolvedValue(roadmap);

    const command = new PublishRoadmapCommand('roadmap-lock-1', roadmap.getAggregateVersion(), 't', 'c', 'ca');
    await service.publishRoadmap(command);

    expect(roadmapLock.lock).toHaveBeenCalledWith('roadmap-lock-1');
    expect(roadmapLock.unlock).toHaveBeenCalledWith({ token: 'tok' });
  });

  it('releases the lock even when the command fails (roadmap not found)', async () => {
    repository.findById.mockResolvedValue(null);

    const command = new PublishRoadmapCommand('missing-roadmap', 1, 't', 'c', 'ca');

    await expect(service.publishRoadmap(command)).rejects.toThrow(RoadmapNotFoundError);
    expect(roadmapLock.lock).toHaveBeenCalledWith('missing-roadmap');
    expect(roadmapLock.unlock).toHaveBeenCalledWith({ token: 'tok' });
  });

  it('works without a lock service (backward compatible, lock is optional)', async () => {
    const roadmap = makeRoadmap();
    repository.findById.mockResolvedValue(roadmap);
    const noLockService = new RoadmapCommandService(repository, eventPublisher);

    const command = new PublishRoadmapCommand('roadmap-lock-1', roadmap.getAggregateVersion(), 't', 'c', 'ca');
    await expect(noLockService.publishRoadmap(command)).resolves.toBeDefined();
  });

  it('createRoadmap: Goal -> Roadmap decomposition persists a non-empty plan and publishes RoadmapCreated', async () => {
    const command = new CreateRoadmapCommand(
      'roadmap-new-1',
      'goal-1',
      'learner-1',
      'Master TypeScript',
      'Deep TS knowledge',
      'SKILL',
      'INTERMEDIATE',
      'HIGH',
      [],
      '2027-01-01',
      't',
      'c',
      'ca'
    );

    const roadmap = await service.createRoadmap(command);

    expect(repository.save).toHaveBeenCalledWith(roadmap);
    expect(eventPublisher.publishMany).toHaveBeenCalled();
    const [publishedEvents] = eventPublisher.publishMany.mock.calls[0];
    expect(publishedEvents[0].type).toBe('RoadmapCreated');
    expect(roadmap.getPhases().length).toBeGreaterThan(0);
  });

  it('wraps an invalid lifecycle transition from the aggregate as RoadmapStateTransitionError', async () => {
    const roadmap = makeRoadmap();
    roadmap.archive({ traceId: 't', correlationId: 'c', causationId: 'ca' }, roadmap.getAggregateVersion());
    repository.findById.mockResolvedValue(roadmap);

    const command = new PublishRoadmapCommand('roadmap-lock-1', roadmap.getAggregateVersion(), 't', 'c', 'ca');

    await expect(service.publishRoadmap(command)).rejects.toBeInstanceOf(RoadmapStateTransitionError);
  });
});
