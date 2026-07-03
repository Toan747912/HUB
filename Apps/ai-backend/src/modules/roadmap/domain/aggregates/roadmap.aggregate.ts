import { randomUUID } from 'crypto';
import {
  GoalId,
  LearnerId,
  MilestoneId,
  PhaseId,
  RoadmapId,
  SkillId,
  TaskId,
} from '../../../../shared/domain/identifiers';
import { RoadmapPhase } from '../entities/roadmap-phase.entity';
import { RoadmapMilestone } from '../entities/roadmap-milestone.entity';
import { RoadmapTask } from '../entities/roadmap-task.entity';
import { RoadmapProgress } from '../entities/roadmap-progress.entity';
import { RoadmapRevision } from '../entities/roadmap-revision.entity';
import {
  roadmapArchivedEvent,
  roadmapCompletedEvent,
  roadmapCreatedEvent,
  roadmapInvalidatedEvent,
  roadmapPublishedEvent,
  roadmapRegeneratedEvent,
  roadmapUpdatedEvent,
} from '../events/roadmap-events';
import { RoadmapDomainEvent, RoadmapEventMetadata } from '../events/roadmap-event-metadata';
import { RoadmapDomainError } from '../errors/roadmap-domain.error';
import { ensureValidLifecycleTransition } from '../invariants/roadmap-lifecycle.invariant';
import { ensureExpectedVersion } from '../invariants/roadmap-version.invariant';
import { ensureNonEmptyPlan } from '../invariants/roadmap-structure.invariant';
import { RoadmapStatus, RoadmapStatusValue } from '../value-objects/roadmap-status.vo';
import { PlanningInput, ResolvedPlanningResult } from '../engine/roadmap-planning.types';

type EventContext = {
  traceId: string;
  correlationId: string;
  causationId: string;
};

type RoadmapCreateProps = {
  roadmapId: RoadmapId;
  goalId: GoalId;
  learnerId: LearnerId;
  goalSnapshot: PlanningInput;
  plan: ResolvedPlanningResult;
};

export class Roadmap {
  private aggregateVersion = 0;
  private status: RoadmapStatus = RoadmapStatus.draft();
  private phases: RoadmapPhase[] = [];
  private revisions: RoadmapRevision[] = [];
  private progress: RoadmapProgress = new RoadmapProgress(0, []);
  private estimatedDurationDays = 0;
  private complexity = 'LOW';
  private plannerVersion = '';
  private goalSnapshot!: PlanningInput;
  private invalidatedAt: Date | null = null;
  private pendingEvents: RoadmapDomainEvent[] = [];

  private constructor(
    private readonly roadmapId: RoadmapId,
    private readonly goalId: GoalId,
    private readonly learnerId: LearnerId,
  ) {}

  static create(props: RoadmapCreateProps, context: EventContext): Roadmap {
    const phases = toPhaseEntities(props.plan);
    ensureNonEmptyPlan(phases);

    const aggregate = new Roadmap(props.roadmapId, props.goalId, props.learnerId);
    aggregate.goalSnapshot = props.goalSnapshot;
    aggregate.applyPlan(props.plan, phases);
    aggregate.appendRevision('CREATED');

    aggregate.recordEvent(
      roadmapCreatedEvent(aggregate.buildMetadata(context), {
        goalId: props.goalId.toString(),
        learnerId: props.learnerId.toString(),
        status: aggregate.status.getValue(),
        phaseCount: phases.length,
        estimatedDurationDays: aggregate.estimatedDurationDays,
        complexity: aggregate.complexity,
      }),
    );

    return aggregate;
  }

  getId(): RoadmapId {
    return this.roadmapId;
  }

  getGoalId(): GoalId {
    return this.goalId;
  }

  getStatus(): RoadmapStatusValue {
    return this.status.getValue();
  }

  getAggregateVersion(): number {
    return this.aggregateVersion;
  }

  getPhases(): RoadmapPhase[] {
    return [...this.phases];
  }

  getRevisions(): RoadmapRevision[] {
    return [...this.revisions];
  }

  getProgress(): RoadmapProgress {
    return this.progress;
  }

  getEstimatedDurationDays(): number {
    return this.estimatedDurationDays;
  }

  getComplexity(): string {
    return this.complexity;
  }

  getPlannerVersion(): string {
    return this.plannerVersion;
  }

  getGoalSnapshot(): PlanningInput {
    return this.goalSnapshot;
  }

  getInvalidatedAt(): Date | null {
    return this.invalidatedAt;
  }

  pullEvents(): RoadmapDomainEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }

  updateDefinition(
    changes: Record<string, unknown>,
    context: EventContext,
    expectedVersion?: number,
  ): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    this.bumpVersion();
    this.appendRevision('UPDATED');
    this.recordEvent(roadmapUpdatedEvent(this.buildMetadata(context), { changes }));
  }

  publish(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'PUBLISHED');
    this.bumpVersion();
    this.status = RoadmapStatus.create('PUBLISHED');
    this.recordEvent(roadmapPublishedEvent(this.buildMetadata(context), { previousStatus }));
  }

  archive(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'ARCHIVED');
    this.bumpVersion();
    this.status = RoadmapStatus.create('ARCHIVED');
    this.recordEvent(roadmapArchivedEvent(this.buildMetadata(context), { previousStatus }));
  }

  regenerate(plan: ResolvedPlanningResult, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const phases = toPhaseEntities(plan);
    ensureNonEmptyPlan(phases);

    const fromVersion =
      this.revisions.length === 0 ? 0 : this.revisions[this.revisions.length - 1].version;
    this.bumpVersion();
    this.applyPlan(plan, phases);
    this.progress = new RoadmapProgress(0, []);
    this.appendRevision('REGENERATED');

    this.recordEvent(
      roadmapRegeneratedEvent(this.buildMetadata(context), {
        fromVersion,
        toVersion: this.revisions[this.revisions.length - 1].version,
        plannerVersion: this.plannerVersion,
        phaseCount: phases.length,
        estimatedDurationDays: this.estimatedDurationDays,
        complexity: this.complexity,
      }),
    );
  }

  // Orthogonal staleness flag: independent of `status`'s lifecycle state
  // machine. Signals "something upstream changed, this may need to be
  // regenerated" without deciding what regeneration means or forcing a
  // lifecycle transition. Intentionally not gated by assertNotTerminalMutation
  // — an archived/completed roadmap can still be flagged stale.
  invalidate(reason: string, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.bumpVersion();
    this.invalidatedAt = new Date();
    this.recordEvent(roadmapInvalidatedEvent(this.buildMetadata(context), { reason }));
  }

  completeTask(taskId: TaskId, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    let found = false;
    let totalTasks = 0;
    const updatedPhases = this.phases.map((phase) => {
      const updatedMilestones = phase.milestones.map((milestone) => {
        const updatedTasks = milestone.tasks.map((task) => {
          totalTasks += 1;
          if (task.id.equals(taskId)) {
            found = true;
            return task.completed ? task : task.markCompleted();
          }
          return task;
        });
        return new RoadmapMilestone(
          milestone.id,
          milestone.title,
          milestone.order,
          updatedTasks,
          milestone.reached,
          milestone.reachedAt,
        );
      });
      return new RoadmapPhase(phase.id, phase.title, phase.order, updatedMilestones);
    });

    if (!found) {
      throw new RoadmapDomainError('ROADMAP_TASK_NOT_FOUND', `Task ${taskId.toString()} not found`);
    }

    this.bumpVersion();
    this.phases = updatedPhases;

    const completedTaskIds = this.phases.flatMap((phase) =>
      phase.milestones.flatMap((milestone) =>
        milestone.tasks.filter((task) => task.completed).map((task) => task.id.toString()),
      ),
    );
    const completionRatio =
      totalTasks === 0 ? 0 : Math.round((completedTaskIds.length / totalTasks) * 100);
    this.progress = this.progress.update(completionRatio, completedTaskIds);

    if (completionRatio === 100 && this.status.getValue() === 'PUBLISHED') {
      const previousStatus = this.status.getValue();
      this.status = RoadmapStatus.create('COMPLETED');
      this.recordEvent(
        roadmapCompletedEvent(this.buildMetadata(context), { previousStatus, completionRatio }),
      );
      return;
    }

    this.recordEvent(
      roadmapUpdatedEvent(this.buildMetadata(context), { changes: { completionRatio } }),
    );
  }

  private applyPlan(plan: ResolvedPlanningResult, phases: RoadmapPhase[]): void {
    this.phases = phases;
    this.estimatedDurationDays = plan.estimatedDurationDays;
    this.complexity = plan.complexity;
    this.plannerVersion = plan.plannerVersion;
  }

  private appendRevision(reason: 'CREATED' | 'UPDATED' | 'REGENERATED'): void {
    const milestoneCount = this.phases.reduce((sum, phase) => sum + phase.milestones.length, 0);
    const taskCount = this.phases.reduce(
      (sum, phase) =>
        sum + phase.milestones.reduce((mSum, milestone) => mSum + milestone.tasks.length, 0),
      0,
    );

    const revision = new RoadmapRevision(
      this.revisions.length + 1,
      reason,
      this.plannerVersion,
      this.phases.length,
      milestoneCount,
      taskCount,
      this.estimatedDurationDays,
      this.complexity,
    );
    this.revisions = [...this.revisions, revision];
  }

  private assertNotTerminalMutation(): void {
    if (this.status.isTerminal()) {
      throw new RoadmapDomainError(
        'ROADMAP_TERMINAL_STATE_MUTATION_FORBIDDEN',
        'Roadmap is in a terminal state and cannot be mutated',
      );
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

  private buildMetadata(context: EventContext): RoadmapEventMetadata {
    return {
      eventId: randomUUID(),
      aggregateId: this.roadmapId,
      aggregateType: 'Roadmap',
      aggregateVersion: this.aggregateVersion,
      occurredAt: new Date().toISOString(),
      traceId: context.traceId,
      correlationId: context.correlationId,
      causationId: context.causationId,
      goalId: this.goalId,
      plannerVersion: this.plannerVersion,
    };
  }

  private recordEvent(event: RoadmapDomainEvent): void {
    this.pendingEvents.push(event);
  }
}

function toPhaseEntities(plan: ResolvedPlanningResult): RoadmapPhase[] {
  return plan.phases.map(
    (phase) =>
      new RoadmapPhase(
        PhaseId.create(phase.id),
        phase.title,
        phase.order,
        phase.milestones.map(
          (milestone) =>
            new RoadmapMilestone(
              MilestoneId.create(milestone.id),
              milestone.title,
              milestone.order,
              milestone.tasks.map(
                (task) =>
                  new RoadmapTask(
                    TaskId.create(task.id),
                    task.title,
                    task.order,
                    task.dependsOn.map((id) => TaskId.create(id)),
                    task.estimatedDurationDays,
                    task.complexity,
                    SkillId.create(task.skillId),
                  ),
              ),
            ),
        ),
      ),
  );
}
