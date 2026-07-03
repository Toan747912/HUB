import { GoalId, LearnerId, MilestoneId } from '../../../../shared/domain/identifiers';
import { Goal } from '../../domain/aggregates/goal.aggregate';
import { GoalConstraint } from '../../domain/entities/goal-constraint.entity';
import { GoalMilestone } from '../../domain/entities/goal-milestone.entity';
import { GoalDomainError } from '../../domain/errors/goal-domain.error';
import { GoalDifficulty } from '../../domain/value-objects/goal-difficulty.vo';
import { Priority } from '../../../../shared/domain/vocabulary/priority.vo';
import { GoalType } from '../../domain/value-objects/goal-type.vo';
import { TargetDate } from '../../domain/value-objects/target-date.vo';
import { CreateGoalCommand } from '../commands/create-goal.command';
import { UpdateGoalCommand } from '../commands/update-goal.command';
import { ArchiveGoalCommand } from '../commands/archive-goal.command';
import { CompleteGoalCommand } from '../commands/complete-goal.command';
import { AddGoalMilestoneCommand } from '../commands/add-goal-milestone.command';
import { IGoalRepository } from '../contracts/goal-repository.contract';
import { IEventPublisher } from '../contracts/event-publisher.contract';
import {
  GoalNotFoundError,
  GoalVersionConflictError,
  GoalStateTransitionError,
  GoalValidationError,
} from '../errors/application.errors';

export interface IGoalLock {
  lock(goalId: string): Promise<unknown>;
  unlock(lock: unknown): Promise<void>;
}

export class GoalCommandService {
  constructor(
    private readonly repository: IGoalRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly goalLock?: IGoalLock,
  ) {}

  private async withLock<T>(goalId: string, fn: () => Promise<T>): Promise<T> {
    if (!this.goalLock) {
      return fn();
    }
    const lock = await this.goalLock.lock(goalId);
    try {
      return await fn();
    } finally {
      await this.goalLock.unlock(lock);
    }
  }

  async createGoal(command: CreateGoalCommand): Promise<Goal> {
    const start = Date.now();
    try {
      const goal = Goal.create(
        {
          goalId: GoalId.create(command.goalId),
          learnerId: LearnerId.create(command.learnerId),
          title: command.title,
          description: command.description,
          type: GoalType.create(command.type as any),
          difficulty: GoalDifficulty.create(command.difficulty as any),
          priority: Priority.create(command.priority as any),
          targetDate: TargetDate.create(command.targetDate),
        },
        {
          traceId: command.traceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        },
      );

      await this.repository.save(goal);
      const events = goal.pullEvents();
      await this.eventPublisher.publishMany(events);

      this.log('CREATE_GOAL', command.goalId, start, 'SUCCESS');
      return goal;
    } catch (error) {
      this.log('CREATE_GOAL', command.goalId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async updateGoal(command: UpdateGoalCommand): Promise<Goal> {
    const start = Date.now();
    try {
      const goal = await this.withLock(command.goalId, async () => {
        const g = await this.repository.findById(command.goalId);
        if (!g) throw new GoalNotFoundError(command.goalId);

        g.updateDefinition(
          command.title,
          command.description,
          GoalType.create(command.type as any),
          GoalDifficulty.create(command.difficulty as any),
          Priority.create(command.priority as any),
          TargetDate.create(command.targetDate),
          {
            traceId: command.traceId,
            correlationId: command.correlationId,
            causationId: command.causationId,
          },
          command.expectedVersion,
        );

        await this.repository.save(g);
        const events = g.pullEvents();
        await this.eventPublisher.publishMany(events);
        return g;
      });

      this.log('UPDATE_GOAL', command.goalId, start, 'SUCCESS');
      return goal;
    } catch (error) {
      this.log('UPDATE_GOAL', command.goalId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async archiveGoal(command: ArchiveGoalCommand): Promise<Goal> {
    const start = Date.now();
    try {
      const goal = await this.withLock(command.goalId, async () => {
        const g = await this.repository.findById(command.goalId);
        if (!g) throw new GoalNotFoundError(command.goalId);

        g.transitionTo(
          'ARCHIVED',
          {
            traceId: command.traceId,
            correlationId: command.correlationId,
            causationId: command.causationId,
          },
          command.expectedVersion,
        );

        await this.repository.save(g);
        const events = g.pullEvents();
        await this.eventPublisher.publishMany(events);
        return g;
      });

      this.log('ARCHIVE_GOAL', command.goalId, start, 'SUCCESS');
      return goal;
    } catch (error) {
      this.log('ARCHIVE_GOAL', command.goalId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async completeGoal(command: CompleteGoalCommand): Promise<Goal> {
    const start = Date.now();
    try {
      const goal = await this.withLock(command.goalId, async () => {
        const g = await this.repository.findById(command.goalId);
        if (!g) throw new GoalNotFoundError(command.goalId);

        g.transitionTo(
          'COMPLETED',
          {
            traceId: command.traceId,
            correlationId: command.correlationId,
            causationId: command.causationId,
          },
          command.expectedVersion,
        );

        await this.repository.save(g);
        const events = g.pullEvents();
        await this.eventPublisher.publishMany(events);
        return g;
      });

      this.log('COMPLETE_GOAL', command.goalId, start, 'SUCCESS');
      return goal;
    } catch (error) {
      this.log('COMPLETE_GOAL', command.goalId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  async addMilestone(command: AddGoalMilestoneCommand): Promise<Goal> {
    const start = Date.now();
    try {
      const goal = await this.withLock(command.goalId, async () => {
        const g = await this.repository.findById(command.goalId);
        if (!g) throw new GoalNotFoundError(command.goalId);

        const milestone = new GoalMilestone(
          MilestoneId.create(command.milestoneId),
          command.description,
        );
        g.addMilestone(milestone, command.expectedVersion);

        await this.repository.save(g);
        const events = g.pullEvents();
        await this.eventPublisher.publishMany(events);
        return g;
      });

      this.log('ADD_MILESTONE', command.goalId, start, 'SUCCESS');
      return goal;
    } catch (error) {
      this.log('ADD_MILESTONE', command.goalId, start, 'FAILURE', error);
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof GoalDomainError) {
      if (error.code === 'GOAL_VERSION_CONFLICT') {
        return new GoalVersionConflictError(0, 0);
      }
      if (error.code === 'GOAL_TERMINAL_STATE_MUTATION_FORBIDDEN') {
        return new GoalStateTransitionError(error.message);
      }
      return new GoalValidationError(error.message);
    }
    if (error instanceof GoalNotFoundError) return error;
    return error instanceof Error ? error : new Error(String(error));
  }

  private log(
    operation: string,
    aggregateId: string,
    startMs: number,
    status: string,
    error?: unknown,
  ): void {
    const entry = {
      traceId: 'app',
      aggregateId,
      operation,
      latencyMs: Date.now() - startMs,
      status,
      errorType: error instanceof Error ? error.constructor.name : undefined,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(entry));
  }
}
