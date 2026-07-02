import { GoalId, LearnerId, RoadmapId, TaskId } from '../../../../shared/domain/identifiers';
import { Roadmap } from '../../domain/aggregates/roadmap.aggregate';
import { RoadmapPlanningEngine } from '../../domain/engine/roadmap-planning.engine';
import { PlanningInput } from '../../domain/engine/roadmap-planning.types';
import { RoadmapDomainError } from '../../domain/errors/roadmap-domain.error';
import { CreateRoadmapCommand } from '../commands/create-roadmap.command';
import { UpdateRoadmapCommand } from '../commands/update-roadmap.command';
import { ArchiveRoadmapCommand } from '../commands/archive-roadmap.command';
import { PublishRoadmapCommand } from '../commands/publish-roadmap.command';
import { RegenerateRoadmapCommand } from '../commands/regenerate-roadmap.command';
import { CompleteRoadmapTaskCommand } from '../commands/complete-roadmap-task.command';
import { InvalidateRoadmapCommand } from '../commands/invalidate-roadmap.command';
import { IRoadmapRepository } from '../contracts/roadmap-repository.contract';
import { IEventPublisher } from '../contracts/event-publisher.contract';
import {
  RoadmapNotFoundError,
  RoadmapStateTransitionError,
  RoadmapValidationError,
  RoadmapVersionConflictError
} from '../errors/application.errors';

export interface IRoadmapLock {
  lock(roadmapId: string): Promise<unknown>;
  unlock(lock: unknown): Promise<void>;
}

export interface IRoadmapGenerationMetrics {
  recordRoadmapGenerationDuration(durationSeconds: number): void;
}

export class RoadmapCommandService {
  private readonly planningEngine = new RoadmapPlanningEngine();

  constructor(
    private readonly repository: IRoadmapRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly roadmapLock?: IRoadmapLock,
    private readonly generationMetrics?: IRoadmapGenerationMetrics
  ) {}

  private generatePlan(input: PlanningInput) {
    const start = Date.now();
    const plan = this.planningEngine.generate(input);
    this.generationMetrics?.recordRoadmapGenerationDuration((Date.now() - start) / 1000);
    return plan;
  }

  private async withLock<T>(roadmapId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.roadmapLock) {
      return fn();
    }
    const lock = await this.roadmapLock.lock(roadmapId);
    try {
      return await fn();
    } finally {
      await this.roadmapLock.unlock(lock);
    }
  }

  async createRoadmap(command: CreateRoadmapCommand): Promise<Roadmap> {
    const start = Date.now();
    try {
      const goalSnapshot: PlanningInput = {
        goalId: command.goalId,
        learnerId: command.learnerId,
        title: command.title,
        description: command.description,
        goalType: command.goalType,
        difficulty: command.difficulty,
        priority: command.priority,
        constraints: command.constraints,
        targetDate: command.targetDate
      };

      const plan = this.generatePlan(goalSnapshot);

      const roadmap = Roadmap.create(
        {
          roadmapId: RoadmapId.create(command.roadmapId),
          goalId: GoalId.create(command.goalId),
          learnerId: LearnerId.create(command.learnerId),
          goalSnapshot,
          plan
        },
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId
        }
      );

      await this.repository.save(roadmap);
      const events = roadmap.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('CREATE_ROADMAP', command.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('CREATE_ROADMAP', command.roadmapId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async updateRoadmap(command: UpdateRoadmapCommand): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.withLock(command.roadmapId, async () => {
        const r = await this.repository.findById(command.roadmapId);
        if (!r) throw new RoadmapNotFoundError(command.roadmapId);

        r.updateDefinition(
          command.changes,
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('UPDATE_ROADMAP', command.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('UPDATE_ROADMAP', command.roadmapId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async publishRoadmap(command: PublishRoadmapCommand): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.withLock(command.roadmapId, async () => {
        const r = await this.repository.findById(command.roadmapId);
        if (!r) throw new RoadmapNotFoundError(command.roadmapId);

        r.publish(
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('PUBLISH_ROADMAP', command.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('PUBLISH_ROADMAP', command.roadmapId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async archiveRoadmap(command: ArchiveRoadmapCommand): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.withLock(command.roadmapId, async () => {
        const r = await this.repository.findById(command.roadmapId);
        if (!r) throw new RoadmapNotFoundError(command.roadmapId);

        r.archive(
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('ARCHIVE_ROADMAP', command.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('ARCHIVE_ROADMAP', command.roadmapId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async regenerateRoadmap(command: RegenerateRoadmapCommand): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.withLock(command.roadmapId, async () => {
        const r = await this.repository.findById(command.roadmapId);
        if (!r) throw new RoadmapNotFoundError(command.roadmapId);

        const plan = this.generatePlan(r.getGoalSnapshot());
        r.regenerate(
          plan,
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('REGENERATE_ROADMAP', command.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('REGENERATE_ROADMAP', command.roadmapId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async completeTask(command: CompleteRoadmapTaskCommand): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.withLock(command.roadmapId, async () => {
        const r = await this.repository.findById(command.roadmapId);
        if (!r) throw new RoadmapNotFoundError(command.roadmapId);

        r.completeTask(
          TaskId.create(command.taskId),
          { traceId: command.traceId, correlationId: command.correlationId, causationId: command.causationId },
          command.expectedVersion
        );

        await this.repository.save(r);
        const events = r.pullEvents();
        await this.eventPublisher.publishMany(events);
        return r;
      });

      this.log('COMPLETE_ROADMAP_TASK', command.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('COMPLETE_ROADMAP_TASK', command.roadmapId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async invalidateRoadmap(command: InvalidateRoadmapCommand): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.withLock(command.roadmapId, async () => {
        const r = await this.repository.findById(command.roadmapId);
        if (!r) throw new RoadmapNotFoundError(command.roadmapId);

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

      this.log('INVALIDATE_ROADMAP', command.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('INVALIDATE_ROADMAP', command.roadmapId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof RoadmapDomainError) {
      if (error.code === 'ROADMAP_VERSION_CONFLICT') {
        return new RoadmapVersionConflictError(0, 0);
      }
      if (error.code === 'ROADMAP_TERMINAL_STATE_MUTATION_FORBIDDEN' || error.code === 'INVALID_STATE_TRANSITION') {
        return new RoadmapStateTransitionError(error.message);
      }
      return new RoadmapValidationError(error.message);
    }
    if (error instanceof RoadmapNotFoundError) return error;
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
