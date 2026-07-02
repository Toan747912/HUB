import { randomUUID } from 'crypto';
import { GoalId, LearnerId, MilestoneId } from '../../../../shared/domain/identifiers';
import { GoalConstraint } from '../entities/goal-constraint.entity';
import { GoalMilestone } from '../entities/goal-milestone.entity';
import { GoalProgress } from '../entities/goal-progress.entity';
import { GoalVersion } from '../entities/goal-version.entity';
import { goalArchivedEvent, goalCompletedEvent, goalConstraintChangedEvent, goalCreatedEvent, goalMilestoneReachedEvent, goalUpdatedEvent } from '../events/goal-events';
import { GoalDomainEvent, GoalEventMetadata } from '../events/goal-event-metadata';
import { GoalDomainError } from '../errors/goal-domain.error';
import { ensureValidLifecycleTransition } from '../invariants/goal-lifecycle.invariant';
import { ensureExpectedVersion } from '../invariants/goal-version.invariant';
import { GoalDifficulty } from '../value-objects/goal-difficulty.vo';
import { Priority } from '../../../../shared/domain/vocabulary/priority.vo';
import { GoalStatus, GoalStatusValue } from '../value-objects/goal-status.vo';
import { GoalType } from '../value-objects/goal-type.vo';
import { TargetDate } from '../value-objects/target-date.vo';

type EventContext = {
  traceId: string;
  correlationId: string;
  causationId: string;
};

type GoalCreateProps = {
  goalId: GoalId;
  learnerId: LearnerId;
  title: string;
  description: string;
  type: GoalType;
  difficulty: GoalDifficulty;
  priority: Priority;
  targetDate: TargetDate;
};

export class Goal {
  private aggregateVersion = 0;
  private status: GoalStatus = GoalStatus.draft();
  private versions: GoalVersion[] = [];
  private constraints: GoalConstraint[] = [];
  private milestones: GoalMilestone[] = [];
  private progress: GoalProgress = new GoalProgress(0, []);
  private pendingEvents: GoalDomainEvent[] = [];

  private constructor(private readonly goalId: GoalId, private readonly learnerId: LearnerId) {}

  static create(props: GoalCreateProps, context: EventContext): Goal {
    const aggregate = new Goal(props.goalId, props.learnerId);
    aggregate.appendVersion(props.title, props.description, props.type, props.difficulty, props.priority, props.targetDate);
    aggregate.recordEvent(
      goalCreatedEvent(aggregate.buildMetadata(context), {
        learnerId: props.learnerId.toString(),
        status: aggregate.status.getValue(),
        title: props.title
      })
    );
    return aggregate;
  }

  getId(): GoalId {
    return this.goalId;
  }

  getStatus(): GoalStatusValue {
    return this.status.getValue();
  }

  getAggregateVersion(): number {
    return this.aggregateVersion;
  }

  getVersions(): GoalVersion[] {
    return [...this.versions];
  }

  getProgress(): GoalProgress {
    return this.progress;
  }

  getMilestones(): GoalMilestone[] {
    return [...this.milestones];
  }

  getConstraints(): GoalConstraint[] {
    return [...this.constraints];
  }

  pullEvents(): GoalDomainEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }

  transitionTo(nextStatus: GoalStatusValue, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    const currentStatus = this.status.getValue();
    ensureValidLifecycleTransition(currentStatus, nextStatus);
    this.bumpVersion();
    this.status = GoalStatus.create(nextStatus);

    if (nextStatus === 'ARCHIVED') {
      this.recordEvent(
        goalArchivedEvent(this.buildMetadata(context), {
          previousStatus: currentStatus
        })
      );
      return;
    }

    if (nextStatus === 'COMPLETED') {
      this.recordEvent(
        goalCompletedEvent(this.buildMetadata(context), {
          previousStatus: currentStatus,
          completionRatio: this.progress.completionRatio
        })
      );
      return;
    }

    this.recordEvent(
      goalUpdatedEvent(this.buildMetadata(context), {
        changes: {
          status: {
            from: currentStatus,
            to: nextStatus
          }
        }
      })
    );
  }

  updateDefinition(
    title: string,
    description: string,
    type: GoalType,
    difficulty: GoalDifficulty,
    priority: Priority,
    targetDate: TargetDate,
    context: EventContext,
    expectedVersion?: number
  ): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    this.appendVersion(title, description, type, difficulty, priority, targetDate);
    this.recordEvent(
      goalUpdatedEvent(this.buildMetadata(context), {
        changes: {
          title,
          description,
          type: type.getValue(),
          difficulty: difficulty.getValue(),
          priority: priority.getValue(),
          targetDate: targetDate.toISOString()
        }
      })
    );
  }

  addConstraint(constraint: GoalConstraint, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    this.bumpVersion();
    this.constraints = [...this.constraints, constraint];
    this.recordEvent(
      goalConstraintChangedEvent(this.buildMetadata(context), {
        constraintId: constraint.id,
        changeType: 'ADDED'
      })
    );
  }

  removeConstraint(constraintId: string, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    const found = this.constraints.some((c) => c.id === constraintId);
    if (!found) {
      throw new GoalDomainError('GOAL_CONSTRAINT_NOT_FOUND', `Constraint ${constraintId} not found`);
    }

    this.bumpVersion();
    this.constraints = this.constraints.filter((c) => c.id !== constraintId);
    this.recordEvent(
      goalConstraintChangedEvent(this.buildMetadata(context), {
        constraintId,
        changeType: 'REMOVED'
      })
    );
  }

  addMilestone(milestone: GoalMilestone, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    this.bumpVersion();
    this.milestones = [...this.milestones, milestone];
  }

  reachMilestone(milestoneId: MilestoneId, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    const index = this.milestones.findIndex((m) => m.id.equals(milestoneId));
    if (index < 0) {
      throw new GoalDomainError('GOAL_MILESTONE_NOT_FOUND', `Milestone ${milestoneId.toString()} not found`);
    }

    const current = this.milestones[index];
    if (!current.reached) {
      this.bumpVersion();
      const updated = current.markReached();
      this.milestones = [...this.milestones.slice(0, index), updated, ...this.milestones.slice(index + 1)];

      const reachedMilestones = this.milestones.filter((m) => m.reached).map((m) => m.id.toString());
      const completionRatio = this.milestones.length === 0 ? 0 : Math.round((reachedMilestones.length / this.milestones.length) * 100);
      this.progress = this.progress.update(completionRatio, reachedMilestones);

      this.recordEvent(
        goalMilestoneReachedEvent(this.buildMetadata(context), {
          milestoneId: milestoneId.toString(),
          completionRatio
        })
      );
    }
  }

  updateProgress(completionRatio: number, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    this.bumpVersion();
    this.progress = this.progress.update(completionRatio, this.progress.reachedMilestoneIds);
    this.recordEvent(
      goalUpdatedEvent(this.buildMetadata(context), {
        changes: {
          completionRatio
        }
      })
    );
  }

  private appendVersion(
    title: string,
    description: string,
    type: GoalType,
    difficulty: GoalDifficulty,
    priority: Priority,
    targetDate: TargetDate
  ): void {
    this.bumpVersion();
    const version = new GoalVersion(
      this.versions.length + 1,
      title,
      description,
      type,
      difficulty,
      priority,
      targetDate
    );
    this.versions = [...this.versions, version];
  }

  private assertNotTerminalMutation(): void {
    if (this.status.isTerminal()) {
      throw new GoalDomainError('GOAL_TERMINAL_STATE_MUTATION_FORBIDDEN', 'Goal is in a terminal state and cannot be mutated');
    }
  }

  private assertConcurrency(expectedVersion?: number): void {
    if (typeof expectedVersion === 'number') {
      ensureExpectedVersion(this.aggregateVersion, expectedVersion);
    }
  }

  private bumpVersion(): void {
    this.aggregateVersion += 1;
  }

  private buildMetadata(context: EventContext): GoalEventMetadata {
    return {
      eventId: randomUUID(),
      aggregateId: this.goalId,
      aggregateType: 'Goal',
      aggregateVersion: this.aggregateVersion,
      occurredAt: new Date().toISOString(),
      traceId: context.traceId,
      correlationId: context.correlationId,
      causationId: context.causationId
    };
  }

  private recordEvent(event: GoalDomainEvent): void {
    this.pendingEvents.push(event);
  }
}
