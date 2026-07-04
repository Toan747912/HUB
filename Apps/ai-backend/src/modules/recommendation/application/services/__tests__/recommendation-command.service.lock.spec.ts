import { IRecommendationRepository } from '../../contracts/recommendation-repository.contract';
import { IEventPublisher } from '../../contracts/event-publisher.contract';
import { GenerateRecommendationsCommand } from '../../commands/generate-recommendations.command';
import { ApproveRecommendationCommand } from '../../commands/approve-recommendation.command';
import { RecommendationNotFoundError } from '../../errors/application.errors';
import {
  IRecommendationLock,
  RecommendationCommandService,
} from '../recommendation-command.service';

const context = { traceId: 't', correlationId: 'c', causationId: 'ca' };

const makeGenerateCommand = (recommendationId = 'rec-lock-1') =>
  new GenerateRecommendationsCommand(
    recommendationId,
    'goal-1',
    'roadmap-1',
    'assessment-1',
    'learner-1',
    'MEDIUM',
    'INTERMEDIATE',
    '2027-06-01T00:00:00.000Z',
    '2027-01-01T00:00:00.000Z',
    60,
    0,
    [
      {
        id: 't1',
        skillId: 'Foundations',
        completed: false,
        order: 1,
        dependsOn: [],
        estimatedDurationDays: 3,
      },
    ],
    [{ skillId: 'Foundations', score: 60, level: 'PROFICIENT' }],
    [],
    70,
    'NOT_READY',
    't',
    'c',
    'ca',
  );

const makeConnection = (): any => ({
  startSession: jest.fn().mockResolvedValue({
    withTransaction: async (fn: () => Promise<void>) => {
      await fn();
    },
    endSession: jest.fn().mockResolvedValue(undefined),
  }),
});

describe('RecommendationCommandService — distributed lock wiring', () => {
  let repository: jest.Mocked<IRecommendationRepository>;
  let eventPublisher: jest.Mocked<IEventPublisher>;
  let connection: any;
  let recommendationLock: jest.Mocked<IRecommendationLock>;
  let service: RecommendationCommandService;

  beforeEach(() => {
    repository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    } as any;
    eventPublisher = {
      publish: jest.fn(),
      publishMany: jest.fn().mockResolvedValue(undefined),
      stage: jest.fn().mockResolvedValue(undefined),
    };
    connection = makeConnection();
    recommendationLock = {
      lock: jest.fn().mockResolvedValue({ token: 'tok' }),
      unlock: jest.fn().mockResolvedValue(undefined),
    };
    service = new RecommendationCommandService(
      repository,
      eventPublisher,
      connection,
      recommendationLock,
    );
  });

  it('generateRecommendations persists a GENERATED recommendation and publishes RecommendationGenerated + LearningStrategyChanged', async () => {
    const recommendation = await service.generateRecommendations(makeGenerateCommand());

    expect(repository.save).toHaveBeenCalledWith(recommendation, expect.anything());
    expect(eventPublisher.publishMany).toHaveBeenCalled();
    const [publishedEvents] = eventPublisher.publishMany.mock.calls[0];
    expect(publishedEvents.map((e: any) => e.type)).toEqual([
      'RecommendationGenerated',
      'LearningStrategyChanged',
    ]);
    expect(recommendation.getStatus()).toBe('GENERATED');
  });

  it('generateRecommendations: same input twice yields the same items/scores (deterministic engine wiring)', async () => {
    const r1 = await service.generateRecommendations(makeGenerateCommand('rec-a'));
    const r2 = await service.generateRecommendations(makeGenerateCommand('rec-b'));

    expect(r1.getItems().map((i) => i.scores.priorityScore)).toEqual(
      r2.getItems().map((i) => i.scores.priorityScore),
    );
    expect(r1.getLearningStrategies().map((s) => s.strategy)).toEqual(
      r2.getLearningStrategies().map((s) => s.strategy),
    );
  });

  it('acquires and releases the lock around approveRecommendation', async () => {
    const generated = await service.generateRecommendations(makeGenerateCommand());
    repository.findById.mockResolvedValue(generated);

    const command = new ApproveRecommendationCommand(
      'rec-lock-1',
      generated.getAggregateVersion(),
      't',
      'c',
      'ca',
    );
    await service.approveRecommendation(command);

    expect(recommendationLock.lock).toHaveBeenCalledWith('rec-lock-1');
    expect(recommendationLock.unlock).toHaveBeenCalledWith({ token: 'tok' });
  });

  it('releases the lock even when the command fails (recommendation not found)', async () => {
    repository.findById.mockResolvedValue(null);

    const command = new ApproveRecommendationCommand('missing-rec', 1, 't', 'c', 'ca');
    await expect(service.approveRecommendation(command)).rejects.toThrow(
      RecommendationNotFoundError,
    );

    expect(recommendationLock.lock).toHaveBeenCalledWith('missing-rec');
    expect(recommendationLock.unlock).toHaveBeenCalledWith({ token: 'tok' });
  });

  it('works without a lock service (backward compatible, lock is optional)', async () => {
    const generated = await service.generateRecommendations(makeGenerateCommand());
    repository.findById.mockResolvedValue(generated);
    const noLockService = new RecommendationCommandService(repository, eventPublisher, connection);

    const command = new ApproveRecommendationCommand(
      'rec-lock-1',
      generated.getAggregateVersion(),
      't',
      'c',
      'ca',
    );
    await expect(noLockService.approveRecommendation(command)).resolves.toBeDefined();
  });
});
