import {
  AssessmentId,
  GoalId,
  LearnerId,
  RecommendationId,
  RoadmapId
} from '../../../../shared/domain/identifiers';
import { Recommendation } from '../../domain/aggregates/recommendation.aggregate';
import { RecommendationEngine } from '../../domain/engine/recommendation.engine';
import { RecommendationInput } from '../../domain/engine/recommendation-engine.types';
import { RecommendationDomainError } from '../../domain/errors/recommendation-domain.error';
import { GenerateRecommendationsCommand } from '../commands/generate-recommendations.command';
import { ApproveRecommendationCommand } from '../commands/approve-recommendation.command';
import { RejectRecommendationCommand } from '../commands/reject-recommendation.command';
import { ArchiveRecommendationCommand } from '../commands/archive-recommendation.command';
import { InvalidateRecommendationCommand } from '../commands/invalidate-recommendation.command';
import { IRecommendationRepository } from '../contracts/recommendation-repository.contract';
import { IEventPublisher } from '../contracts/event-publisher.contract';
import {
  RecommendationNotFoundError,
  RecommendationStateTransitionError,
  RecommendationValidationError,
  RecommendationVersionConflictError
} from '../errors/application.errors';

export interface IRecommendationLock {
  lock(recommendationId: string): Promise<unknown>;
  unlock(lock: unknown): Promise<void>;
}

export interface IRecommendationGenerationMetrics {
  recordRecommendationDuration(durationSeconds: number): void;
  recordPriorityScore(score: number): void;
}

export class RecommendationCommandService {
  private readonly engine = new RecommendationEngine();

  constructor(
    private readonly repository: IRecommendationRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly recommendationLock?: IRecommendationLock,
    private readonly generationMetrics?: IRecommendationGenerationMetrics
  ) {}

  private async withLock<T>(recommendationId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.recommendationLock) {
      return fn();
    }
    const lock = await this.recommendationLock.lock(recommendationId);
    try {
      return await fn();
    } finally {
      await this.recommendationLock.unlock(lock);
    }
  }

  async generateRecommendations(command: GenerateRecommendationsCommand): Promise<Recommendation> {
    const start = Date.now();
    try {
      const input: RecommendationInput = {
        goalId: command.goalId,
        roadmapId: command.roadmapId,
        assessmentId: command.assessmentId,
        learnerId: command.learnerId,
        goalPriority: command.goalPriority,
        goalDifficulty: command.goalDifficulty,
        targetDate: command.targetDate,
        referenceDate: command.referenceDate,
        roadmapCompletionRatio: command.roadmapCompletionRatio,
        revisionCount: command.revisionCount,
        tasks: command.tasks,
        competencies: command.competencies,
        knowledgeGaps: command.knowledgeGaps,
        confidenceScore: command.confidenceScore,
        readiness: command.readiness
      };

      const engineStart = Date.now();
      const computation = this.engine.evaluate(input);
      this.generationMetrics?.recordRecommendationDuration((Date.now() - engineStart) / 1000);
      for (const item of computation.items) {
        this.generationMetrics?.recordPriorityScore(item.scores.priorityScore);
      }

      const recommendation = Recommendation.create(
        {
          recommendationId: RecommendationId.create(command.recommendationId),
          goalId: GoalId.create(command.goalId),
          roadmapId: RoadmapId.create(command.roadmapId),
          assessmentId: AssessmentId.create(command.assessmentId),
          learnerId: LearnerId.create(command.learnerId),
          computation
        },
        { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId }
      );

      await this.repository.save(recommendation);
      const events = recommendation.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('GENERATE_RECOMMENDATIONS', command.recommendationId, start, 'SUCCESS');
      return recommendation;
    } catch (error) {
      this.log('GENERATE_RECOMMENDATIONS', command.recommendationId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async approveRecommendation(command: ApproveRecommendationCommand): Promise<Recommendation> {
    const start = Date.now();
    try {
      const recommendation = await this.withLock(command.recommendationId, async () => {
        const r = await this.repository.findById(command.recommendationId);
        if (!r) throw new RecommendationNotFoundError(command.recommendationId);

        r.approve(
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('APPROVE_RECOMMENDATION', command.recommendationId, start, 'SUCCESS');
      return recommendation;
    } catch (error) {
      this.log('APPROVE_RECOMMENDATION', command.recommendationId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async rejectRecommendation(command: RejectRecommendationCommand): Promise<Recommendation> {
    const start = Date.now();
    try {
      const recommendation = await this.withLock(command.recommendationId, async () => {
        const r = await this.repository.findById(command.recommendationId);
        if (!r) throw new RecommendationNotFoundError(command.recommendationId);

        r.reject(
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.reason,
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('REJECT_RECOMMENDATION', command.recommendationId, start, 'SUCCESS');
      return recommendation;
    } catch (error) {
      this.log('REJECT_RECOMMENDATION', command.recommendationId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async archiveRecommendation(command: ArchiveRecommendationCommand): Promise<Recommendation> {
    const start = Date.now();
    try {
      const recommendation = await this.withLock(command.recommendationId, async () => {
        const r = await this.repository.findById(command.recommendationId);
        if (!r) throw new RecommendationNotFoundError(command.recommendationId);

        r.archive(
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('ARCHIVE_RECOMMENDATION', command.recommendationId, start, 'SUCCESS');
      return recommendation;
    } catch (error) {
      this.log('ARCHIVE_RECOMMENDATION', command.recommendationId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async invalidateRecommendation(command: InvalidateRecommendationCommand): Promise<Recommendation> {
    const start = Date.now();
    try {
      const recommendation = await this.withLock(command.recommendationId, async () => {
        const r = await this.repository.findById(command.recommendationId);
        if (!r) throw new RecommendationNotFoundError(command.recommendationId);

        r.invalidate(
          command.reason,
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('INVALIDATE_RECOMMENDATION', command.recommendationId, start, 'SUCCESS');
      return recommendation;
    } catch (error) {
      this.log('INVALIDATE_RECOMMENDATION', command.recommendationId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof RecommendationDomainError) {
      if (error.code === 'RECOMMENDATION_VERSION_CONFLICT') {
        return new RecommendationVersionConflictError(0, 0);
      }
      if (error.code === 'INVALID_STATE_TRANSITION') {
        return new RecommendationStateTransitionError(error.message);
      }
      return new RecommendationValidationError(error.message);
    }
    if (error instanceof RecommendationNotFoundError) return error;
    return error instanceof Error ? error : new Error(String(error));
  }

  private log(operation: string, aggregateId: string, startMs: number, status: string, error?: unknown): void {
    console.log(
      JSON.stringify({
        traceId: 'app',
        aggregateId,
        operation,
        latencyMs: Date.now() - startMs,
        status,
        errorType: error instanceof Error ? error.constructor.name : undefined,
        timestamp: new Date().toISOString()
      })
    );
  }
}
