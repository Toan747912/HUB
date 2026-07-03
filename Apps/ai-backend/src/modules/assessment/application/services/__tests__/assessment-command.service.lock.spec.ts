import {
  AssessmentId,
  GoalId,
  LearnerId,
  RoadmapId,
} from '../../../../../shared/domain/identifiers';
import { Assessment } from '../../../domain/aggregates/assessment.aggregate';
import { IAssessmentRepository } from '../../contracts/assessment-repository.contract';
import { IEventPublisher } from '../../contracts/event-publisher.contract';
import { CreateAssessmentCommand } from '../../commands/create-assessment.command';
import { RunAssessmentCommand } from '../../commands/run-assessment.command';
import {
  AssessmentNotFoundError,
  AssessmentStateTransitionError,
} from '../../errors/application.errors';
import { AssessmentCommandService, IAssessmentLock } from '../assessment-command.service';

const context = { traceId: 't', correlationId: 'c', causationId: 'ca' };

const makeAssessment = (): Assessment =>
  Assessment.create(
    {
      assessmentId: AssessmentId.create('assessment-lock-1'),
      goalId: GoalId.create('goal-1'),
      roadmapId: RoadmapId.create('roadmap-1'),
      learnerId: LearnerId.create('learner-1'),
    },
    context,
  );

describe('AssessmentCommandService — distributed lock wiring', () => {
  let repository: jest.Mocked<IAssessmentRepository>;
  let eventPublisher: jest.Mocked<IEventPublisher>;
  let assessmentLock: jest.Mocked<IAssessmentLock>;
  let service: AssessmentCommandService;

  beforeEach(() => {
    repository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    } as any;
    eventPublisher = { publish: jest.fn(), publishMany: jest.fn().mockResolvedValue(undefined) };
    assessmentLock = {
      lock: jest.fn().mockResolvedValue({ token: 'tok' }),
      unlock: jest.fn().mockResolvedValue(undefined),
    };
    service = new AssessmentCommandService(repository, eventPublisher, assessmentLock);
  });

  const runCommand = (assessment: Assessment) =>
    new RunAssessmentCommand(
      assessment.getId().toString(),
      80,
      [
        {
          id: 't1',
          skillId: 'Solid',
          completed: true,
          estimatedDurationDays: 2,
          actualDurationDays: 2,
        },
      ],
      0,
      [],
      assessment.getAggregateVersion(),
      't',
      'c',
      'ca',
    );

  it('acquires and releases the lock around runAssessment', async () => {
    const assessment = makeAssessment();
    repository.findById.mockResolvedValue(assessment);

    await service.runAssessment(runCommand(assessment));

    expect(assessmentLock.lock).toHaveBeenCalledWith('assessment-lock-1');
    expect(assessmentLock.unlock).toHaveBeenCalledWith({ token: 'tok' });
  });

  it('releases the lock even when the command fails (assessment not found)', async () => {
    repository.findById.mockResolvedValue(null);

    const command = new RunAssessmentCommand(
      'missing-assessment',
      80,
      [],
      0,
      [],
      1,
      't',
      'c',
      'ca',
    );
    await expect(service.runAssessment(command)).rejects.toThrow(AssessmentNotFoundError);

    expect(assessmentLock.lock).toHaveBeenCalledWith('missing-assessment');
    expect(assessmentLock.unlock).toHaveBeenCalledWith({ token: 'tok' });
  });

  it('works without a lock service (backward compatible, lock is optional)', async () => {
    const assessment = makeAssessment();
    repository.findById.mockResolvedValue(assessment);
    const noLockService = new AssessmentCommandService(repository, eventPublisher);

    await expect(noLockService.runAssessment(runCommand(assessment))).resolves.toBeDefined();
  });

  it('createAssessment persists a DRAFT assessment and publishes AssessmentCreated', async () => {
    const command = new CreateAssessmentCommand(
      'assessment-new-1',
      'goal-1',
      'roadmap-1',
      'learner-1',
      't',
      'c',
      'ca',
    );

    const assessment = await service.createAssessment(command);

    expect(repository.save).toHaveBeenCalledWith(assessment);
    expect(eventPublisher.publishMany).toHaveBeenCalled();
    const [publishedEvents] = eventPublisher.publishMany.mock.calls[0];
    expect(publishedEvents[0].type).toBe('AssessmentCreated');
    expect(assessment.getStatus()).toBe('DRAFT');
  });

  it('runAssessment: same input twice yields the same confidence/readiness (deterministic engine wiring)', async () => {
    const assessment1 = makeAssessment();
    repository.findById.mockResolvedValue(assessment1);
    const result1 = await service.runAssessment(runCommand(assessment1));

    const assessment2 = makeAssessment();
    repository.findById.mockResolvedValue(assessment2);
    const result2 = await service.runAssessment(runCommand(assessment2));

    expect(result1.getLatestResult()!.confidenceScore).toBe(
      result2.getLatestResult()!.confidenceScore,
    );
    expect(result1.getLatestResult()!.readiness).toBe(result2.getLatestResult()!.readiness);
  });

  it('wraps a lock-forbidden re-run (APPROVED) as AssessmentStateTransitionError', async () => {
    const assessment = makeAssessment();
    assessment.run(
      {
        skillScores: [],
        competencies: [],
        knowledgeGaps: [],
        confidenceScore: 90,
        readiness: 'READY',
        weakAreas: [],
        strongAreas: [],
        engineVersion: 'v1',
      },
      context,
      assessment.getAggregateVersion(),
    );
    assessment.approve(context, assessment.getAggregateVersion());
    repository.findById.mockResolvedValue(assessment);

    await expect(service.runAssessment(runCommand(assessment))).rejects.toBeInstanceOf(
      AssessmentStateTransitionError,
    );
  });
});
