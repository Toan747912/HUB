import { AssessmentId, GoalId, LearnerId, RoadmapId } from '../../../../shared/domain/identifiers';
import { Assessment } from '../../domain/aggregates/assessment.aggregate';
import { AssessmentEngine } from '../../domain/engine/assessment.engine';
import { AssessmentInput } from '../../domain/engine/assessment-engine.types';
import { AssessmentDomainError } from '../../domain/errors/assessment-domain.error';
import { CreateAssessmentCommand } from '../commands/create-assessment.command';
import { RunAssessmentCommand } from '../commands/run-assessment.command';
import { ApproveAssessmentCommand } from '../commands/approve-assessment.command';
import { ArchiveAssessmentCommand } from '../commands/archive-assessment.command';
import { InvalidateAssessmentCommand } from '../commands/invalidate-assessment.command';
import { IAssessmentRepository } from '../contracts/assessment-repository.contract';
import { IEventPublisher } from '../contracts/event-publisher.contract';
import {
  AssessmentNotFoundError,
  AssessmentStateTransitionError,
  AssessmentValidationError,
  AssessmentVersionConflictError,
} from '../errors/application.errors';

export interface IAssessmentLock {
  lock(assessmentId: string): Promise<unknown>;
  unlock(lock: unknown): Promise<void>;
}

export interface IAssessmentGenerationMetrics {
  recordAssessmentDuration(durationSeconds: number): void;
}

export class AssessmentCommandService {
  private readonly engine = new AssessmentEngine();

  constructor(
    private readonly repository: IAssessmentRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly assessmentLock?: IAssessmentLock,
    private readonly generationMetrics?: IAssessmentGenerationMetrics,
  ) {}

  private async withLock<T>(assessmentId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.assessmentLock) {
      return fn();
    }
    const lock = await this.assessmentLock.lock(assessmentId);
    try {
      return await fn();
    } finally {
      await this.assessmentLock.unlock(lock);
    }
  }

  async createAssessment(command: CreateAssessmentCommand): Promise<Assessment> {
    const start = Date.now();
    try {
      const assessment = Assessment.create(
        {
          assessmentId: AssessmentId.create(command.assessmentId),
          goalId: GoalId.create(command.goalId),
          roadmapId: RoadmapId.create(command.roadmapId),
          learnerId: LearnerId.create(command.learnerId),
        },
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
      );

      await this.repository.save(assessment);
      const events = assessment.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('CREATE_ASSESSMENT', command.assessmentId, start, 'SUCCESS');
      return assessment;
    } catch (error) {
      this.log('CREATE_ASSESSMENT', command.assessmentId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async runAssessment(command: RunAssessmentCommand): Promise<Assessment> {
    const start = Date.now();
    try {
      const assessment = await this.withLock(command.assessmentId, async () => {
        const a = await this.repository.findById(command.assessmentId);
        if (!a) throw new AssessmentNotFoundError(command.assessmentId);

        const input: AssessmentInput = {
          goalId: a.getGoalId().toString(),
          roadmapId: a.getRoadmapId().toString(),
          learnerId: a.getLearnerId().toString(),
          roadmapCompletionRatio: command.roadmapCompletionRatio,
          tasks: command.tasks,
          revisionCount: command.revisionCount,
          previousRuns: command.previousRuns,
        };

        const engineStart = Date.now();
        const computation = this.engine.evaluate(input);
        this.generationMetrics?.recordAssessmentDuration((Date.now() - engineStart) / 1000);

        a.run(
          computation,
          {
            traceId: command.traceId,
            correlationId: command.correlationId,
            causationId: command.causationId,
          },
          command.expectedVersion,
        );

        await this.repository.save(a);
        const events = a.pullEvents();
        await this.eventPublisher.publishMany(events);
        return a;
      });

      this.log('RUN_ASSESSMENT', command.assessmentId, start, 'SUCCESS');
      return assessment;
    } catch (error) {
      this.log('RUN_ASSESSMENT', command.assessmentId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async approveAssessment(command: ApproveAssessmentCommand): Promise<Assessment> {
    const start = Date.now();
    try {
      const assessment = await this.withLock(command.assessmentId, async () => {
        const a = await this.repository.findById(command.assessmentId);
        if (!a) throw new AssessmentNotFoundError(command.assessmentId);

        a.approve(
          {
            traceId: command.traceId,
            correlationId: command.correlationId,
            causationId: command.causationId,
          },
          command.expectedVersion,
        );

        await this.repository.save(a);
        const events = a.pullEvents();
        await this.eventPublisher.publishMany(events);
        return a;
      });

      this.log('APPROVE_ASSESSMENT', command.assessmentId, start, 'SUCCESS');
      return assessment;
    } catch (error) {
      this.log('APPROVE_ASSESSMENT', command.assessmentId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async archiveAssessment(command: ArchiveAssessmentCommand): Promise<Assessment> {
    const start = Date.now();
    try {
      const assessment = await this.withLock(command.assessmentId, async () => {
        const a = await this.repository.findById(command.assessmentId);
        if (!a) throw new AssessmentNotFoundError(command.assessmentId);

        a.archive(
          {
            traceId: command.traceId,
            correlationId: command.correlationId,
            causationId: command.causationId,
          },
          command.expectedVersion,
        );

        await this.repository.save(a);
        const events = a.pullEvents();
        await this.eventPublisher.publishMany(events);
        return a;
      });

      this.log('ARCHIVE_ASSESSMENT', command.assessmentId, start, 'SUCCESS');
      return assessment;
    } catch (error) {
      this.log('ARCHIVE_ASSESSMENT', command.assessmentId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async invalidateAssessment(command: InvalidateAssessmentCommand): Promise<Assessment> {
    const start = Date.now();
    try {
      const assessment = await this.withLock(command.assessmentId, async () => {
        const a = await this.repository.findById(command.assessmentId);
        if (!a) throw new AssessmentNotFoundError(command.assessmentId);

        a.invalidate(
          command.reason,
          {
            traceId: command.traceId,
            correlationId: command.correlationId,
            causationId: command.causationId,
          },
          command.expectedVersion,
        );

        await this.repository.save(a);
        const events = a.pullEvents();
        await this.eventPublisher.publishMany(events);
        return a;
      });

      this.log('INVALIDATE_ASSESSMENT', command.assessmentId, start, 'SUCCESS');
      return assessment;
    } catch (error) {
      this.log('INVALIDATE_ASSESSMENT', command.assessmentId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof AssessmentDomainError) {
      if (error.code === 'ASSESSMENT_VERSION_CONFLICT') {
        return new AssessmentVersionConflictError(0, 0);
      }
      if (error.code === 'ASSESSMENT_LOCKED_FOR_RUN' || error.code === 'INVALID_STATE_TRANSITION') {
        return new AssessmentStateTransitionError(error.message);
      }
      return new AssessmentValidationError(error.message);
    }
    if (error instanceof AssessmentNotFoundError) return error;
    return error instanceof Error ? error : new Error(String(error));
  }

  private log(
    operation: string,
    aggregateId: string,
    startMs: number,
    status: string,
    error?: unknown,
  ): void {
    console.log(
      JSON.stringify({
        traceId: 'app',
        aggregateId,
        operation,
        latencyMs: Date.now() - startMs,
        status,
        errorType: error instanceof Error ? error.constructor.name : undefined,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
