import { randomUUID } from 'crypto';
import {
  SessionId,
  GoalId,
  RoadmapId,
  AssessmentId,
  LearnerId,
} from '../../../../shared/domain/identifiers';
import { SessionStatus, SessionStatusValue } from '../value-objects/session-status.vo';
import { LearningActivity } from '../entities/learning-activity.entity';
import { SessionTask } from '../entities/session-task.entity';
import { EvidenceRecord } from '../entities/evidence-record.entity';
import { SessionProgress } from '../entities/session-progress.entity';
import { StudyTimer } from '../entities/study-timer.entity';
import { SessionHistory } from '../entities/session-history.entity';
import { SessionReflection } from '../entities/session-reflection.entity';
import { SessionNotes } from '../entities/session-notes.entity';
import {
  LearningSessionDomainEvent,
  LearningSessionEventMetadata,
} from '../events/learning-session-event-metadata';
import { LearningSessionDomainError } from '../errors/learning-session-domain.error';
import { ensureValidLifecycleTransition } from '../invariants/learning-session-lifecycle.invariant';
import { ensureExpectedVersion } from '../invariants/learning-session-version.invariant';
import {
  learningSessionCreatedEvent,
  learningSessionStartedEvent,
  learningSessionPausedEvent,
  learningSessionResumedEvent,
  learningSessionCompletedEvent,
  learningSessionCancelledEvent,
  evidenceRecordedEvent,
  progressUpdatedEvent,
} from '../events/learning-session-events';

type EventContext = {
  traceId: string;
  correlationId: string;
  causationId: string;
};

type LearningSessionCreateProps = {
  sessionId: SessionId;
  goalId: GoalId;
  roadmapId: RoadmapId;
  assessmentId?: AssessmentId | null;
  learnerId: LearnerId;
};

export class LearningSession {
  private aggregateVersion = 0;
  private status: SessionStatus = SessionStatus.draft();
  private activities: LearningActivity[] = [];
  private tasks: SessionTask[] = [];
  private evidence: EvidenceRecord[] = [];
  private progress: SessionProgress = new SessionProgress(0, 0, 0, new Date());
  private timers: StudyTimer[] = [];
  private history: SessionHistory[] = [];
  private reflection: SessionReflection | null = null;
  private notes: SessionNotes | null = null;
  private pendingEvents: LearningSessionDomainEvent[] = [];

  private constructor(
    private readonly sessionId: SessionId,
    private readonly goalId: GoalId,
    private readonly roadmapId: RoadmapId,
    private readonly learnerId: LearnerId,
    private readonly assessmentId: AssessmentId | null = null,
  ) {}

  static create(props: LearningSessionCreateProps, context: EventContext): LearningSession {
    const aggregate = new LearningSession(
      props.sessionId,
      props.goalId,
      props.roadmapId,
      props.learnerId,
      props.assessmentId ?? null,
    );

    aggregate.bumpVersion();
    aggregate.appendHistory('DRAFT', 'Session initialized');
    aggregate.recordEvent(
      learningSessionCreatedEvent(aggregate.buildMetadata(context), {
        goalId: props.goalId.toString(),
        roadmapId: props.roadmapId.toString(),
        learnerId: props.learnerId.toString(),
      }),
    );

    return aggregate;
  }

  getId(): SessionId {
    return this.sessionId;
  }

  getGoalId(): GoalId {
    return this.goalId;
  }

  getRoadmapId(): RoadmapId {
    return this.roadmapId;
  }

  getAssessmentId(): AssessmentId | null {
    return this.assessmentId;
  }

  getLearnerId(): LearnerId {
    return this.learnerId;
  }

  getStatus(): SessionStatusValue {
    return this.status.getValue();
  }

  getAggregateVersion(): number {
    return this.aggregateVersion;
  }

  getActivities(): LearningActivity[] {
    return [...this.activities];
  }

  getTasks(): SessionTask[] {
    return [...this.tasks];
  }

  getEvidence(): EvidenceRecord[] {
    return [...this.evidence];
  }

  getProgress(): SessionProgress {
    return this.progress;
  }

  getTimers(): StudyTimer[] {
    return [...this.timers];
  }

  getHistory(): SessionHistory[] {
    return [...this.history];
  }

  getReflection(): SessionReflection | null {
    return this.reflection;
  }

  getNotes(): SessionNotes | null {
    return this.notes;
  }

  pullEvents(): LearningSessionDomainEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }

  start(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'ACTIVE');

    this.bumpVersion();
    this.status = SessionStatus.active();
    this.appendHistory('ACTIVE', 'Session started');

    // Initialize study timer
    const timerId = randomUUID();
    const newTimer = StudyTimer.start(timerId);
    this.timers = [...this.timers, newTimer];

    this.recordEvent(
      learningSessionStartedEvent(this.buildMetadata(context), {
        startedAt: new Date().toISOString(),
      }),
    );
  }

  pause(reason: string | null = null, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'PAUSED');

    this.bumpVersion();
    this.status = SessionStatus.paused();
    this.appendHistory('PAUSED', reason ?? 'Session paused');

    // Pause active timer
    this.timers = this.timers.map((t) => (!t.pausedAt ? t.pause() : t));

    this.recordEvent(
      learningSessionPausedEvent(this.buildMetadata(context), {
        pausedAt: new Date().toISOString(),
        reason: reason ?? undefined,
      }),
    );
  }

  resume(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'ACTIVE');

    this.bumpVersion();
    this.status = SessionStatus.active();
    this.appendHistory('ACTIVE', 'Session resumed');

    // Resume timer
    this.timers = this.timers.map((t) => (t.pausedAt ? t.resume() : t));

    this.recordEvent(
      learningSessionResumedEvent(this.buildMetadata(context), {
        resumedAt: new Date().toISOString(),
      }),
    );
  }

  complete(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'COMPLETED');

    this.bumpVersion();
    this.status = SessionStatus.completed();
    this.appendHistory('COMPLETED', 'Session completed');

    // Stop active timer by pausing it
    this.timers = this.timers.map((t) => (!t.pausedAt ? t.pause() : t));

    // Force completion of all planned and active activities
    this.activities = this.activities.map((a) => {
      if (a.status === 'PLANNED' || a.status === 'ACTIVE') {
        return a.complete(a.timeSpent);
      }
      return a;
    });

    // Auto-complete all tasks
    this.tasks = this.tasks.map((t) => (!t.completed ? t.complete() : t));
    this.recalculateProgress();

    // Compute average focus / engagement
    const focusAvg = this.calculateFocusScore();
    const engagementAvg = this.calculateEngagementScore();

    this.recordEvent(
      learningSessionCompletedEvent(this.buildMetadata(context), {
        completedAt: new Date().toISOString(),
        focusScore: focusAvg,
        engagementScore: engagementAvg,
      }),
    );

    this.recordEvent(
      progressUpdatedEvent(this.buildMetadata(context), {
        completedTasksCount: this.progress.completedTasksCount,
        totalTasksCount: this.progress.totalTasksCount,
        completionRate: this.progress.completionRate,
      }),
    );
  }

  cancel(reason: string | null = null, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'CANCELLED');

    this.bumpVersion();
    this.status = SessionStatus.cancelled();
    this.appendHistory('CANCELLED', reason ?? 'Session cancelled');

    // Stop timer
    this.timers = this.timers.map((t) => (!t.pausedAt ? t.pause() : t));

    // Cancel activities
    this.activities = this.activities.map((a) => {
      if (a.status === 'PLANNED' || a.status === 'ACTIVE') {
        return a.cancel();
      }
      return a;
    });

    this.recordEvent(
      learningSessionCancelledEvent(this.buildMetadata(context), {
        cancelledAt: new Date().toISOString(),
        reason: reason ?? undefined,
      }),
    );
  }

  archive(reason: string | null = null, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'ARCHIVED');

    this.bumpVersion();
    this.status = SessionStatus.archived();
    this.appendHistory('ARCHIVED', reason ?? 'Session archived');

    // Stop timer
    this.timers = this.timers.map((t) => (!t.pausedAt ? t.pause() : t));

    // Cancel activities
    this.activities = this.activities.map((a) => {
      if (a.status === 'PLANNED' || a.status === 'ACTIVE') {
        return a.cancel();
      }
      return a;
    });
  }

  addTask(task: SessionTask, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    this.bumpVersion();
    this.tasks = [...this.tasks, task];
    this.recalculateProgress();
  }

  toggleTask(
    taskId: string,
    completed: boolean,
    context: EventContext,
    expectedVersion?: number,
  ): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index < 0) {
      throw new LearningSessionDomainError('TASK_NOT_FOUND', `Task ${taskId} not found`);
    }

    const current = this.tasks[index];
    if (current.completed !== completed) {
      this.bumpVersion();
      const updated = completed ? current.complete() : current.uncomplete();
      this.tasks = [...this.tasks.slice(0, index), updated, ...this.tasks.slice(index + 1)];
      this.recalculateProgress();

      this.recordEvent(
        progressUpdatedEvent(this.buildMetadata(context), {
          completedTasksCount: this.progress.completedTasksCount,
          totalTasksCount: this.progress.totalTasksCount,
          completionRate: this.progress.completionRate,
        }),
      );
    }
  }

  addActivity(activity: LearningActivity, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    this.bumpVersion();
    this.activities = [...this.activities, activity];
  }

  startActivity(activityId: string, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const index = this.activities.findIndex((a) => a.id === activityId);
    if (index < 0) {
      throw new LearningSessionDomainError(
        'ACTIVITY_NOT_FOUND',
        `Activity ${activityId} not found`,
      );
    }

    const current = this.activities[index];
    if (current.status === 'PLANNED') {
      this.bumpVersion();
      const updated = current.start();
      this.activities = [
        ...this.activities.slice(0, index),
        updated,
        ...this.activities.slice(index + 1),
      ];
    }
  }

  completeActivity(activityId: string, timeSpentSeconds: number, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    const index = this.activities.findIndex((a) => a.id === activityId);
    if (index < 0) {
      throw new LearningSessionDomainError(
        'ACTIVITY_NOT_FOUND',
        `Activity ${activityId} not found`,
      );
    }

    const current = this.activities[index];
    if (current.status === 'ACTIVE') {
      this.bumpVersion();
      const updated = current.complete(timeSpentSeconds);
      this.activities = [
        ...this.activities.slice(0, index),
        updated,
        ...this.activities.slice(index + 1),
      ];
    }
  }

  recordEvidence(
    props: {
      evidenceId: string;
      activityId?: string;
      completedTasks: number;
      timeSpent: number;
      interruptions: number;
      revisionCount: number;
      focusScore: number;
      engagementScore: number;
    },
    context: EventContext,
    expectedVersion?: number,
  ): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();

    this.bumpVersion();

    const record = new EvidenceRecord(
      props.evidenceId,
      props.completedTasks,
      props.timeSpent,
      props.completedTasks > 0 && this.tasks.length > 0
        ? props.completedTasks / this.tasks.length
        : 0,
      props.interruptions,
      props.revisionCount,
      props.focusScore,
      props.engagementScore,
      new Date(),
    );

    this.evidence = [...this.evidence, record];

    // If activity is provided, complete it
    if (props.activityId) {
      const actIdx = this.activities.findIndex((a) => a.id === props.activityId);
      if (actIdx >= 0 && this.activities[actIdx].status === 'ACTIVE') {
        const updated = this.activities[actIdx].complete(props.timeSpent);
        this.activities = [
          ...this.activities.slice(0, actIdx),
          updated,
          ...this.activities.slice(actIdx + 1),
        ];
      }
    }

    // Automatically check off equivalent number of tasks as completed for testing loop
    let tasksToComplete = props.completedTasks;
    this.tasks = this.tasks.map((t) => {
      if (tasksToComplete > 0 && !t.completed) {
        tasksToComplete--;
        return t.complete();
      }
      return t;
    });

    this.recalculateProgress();

    this.recordEvent(
      evidenceRecordedEvent(this.buildMetadata(context), {
        evidenceId: props.evidenceId,
        activityId: props.activityId,
        completedTasks: props.completedTasks,
        timeSpent: props.timeSpent,
        interruptions: props.interruptions,
        focusScore: props.focusScore,
        engagementScore: props.engagementScore,
      }),
    );

    this.recordEvent(
      progressUpdatedEvent(this.buildMetadata(context), {
        completedTasksCount: this.progress.completedTasksCount,
        totalTasksCount: this.progress.totalTasksCount,
        completionRate: this.progress.completionRate,
      }),
    );
  }

  addReflection(reflection: SessionReflection, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.assertNotTerminalMutation();
    this.bumpVersion();
    this.reflection = reflection;
  }

  saveNotes(content: string): void {
    this.assertNotTerminalMutation();
    this.notes = new SessionNotes(content, new Date());
  }

  private recalculateProgress(): void {
    const completed = this.tasks.filter((t) => t.completed).length;
    const total = this.tasks.length;
    this.progress = this.progress.update(completed, total);
  }

  calculateFocusScore(): number {
    if (this.evidence.length > 0) {
      const avg = this.evidence.reduce((sum, e) => sum + e.focusScore, 0) / this.evidence.length;
      return Math.round(avg);
    }
    // Fallback: calculate based on timers and interruptions
    let interruptions = 0;
    this.timers.forEach((t) => {
      interruptions += t.interruptions;
    });
    return Math.max(0, 100 - interruptions * 10);
  }

  calculateEngagementScore(): number {
    if (this.evidence.length > 0) {
      const avg =
        this.evidence.reduce((sum, e) => sum + e.engagementScore, 0) / this.evidence.length;
      return Math.round(avg);
    }
    // Fallback
    const rate = this.progress.completionRate;
    let revisions = 0;
    this.evidence.forEach((e) => {
      revisions += e.revisionCount;
    });
    return Math.round(rate * 80 + (revisions > 0 ? 20 : 0));
  }

  calculateConsistencyScore(): number {
    // consistency based on total time spent vs some target or simply focus score
    let totalTimeSpent = 0;
    this.timers.forEach((t) => {
      totalTimeSpent += t.getCurrentElapsedSeconds();
    });
    const targetDuration = 1800; // default target duration 30 minutes
    return Math.round(Math.min(100, (totalTimeSpent / targetDuration) * 100));
  }

  calculateCompletionScore(): number {
    return Math.round(this.progress.completionRate * 100);
  }

  calculateSessionEffectiveness(): number {
    const focus = this.calculateFocusScore();
    const engagement = this.calculateEngagementScore();
    const completion = this.calculateCompletionScore();
    return Math.round((focus + engagement + completion) / 3);
  }

  private appendHistory(status: SessionStatusValue, reason: string | null = null): void {
    this.history = [
      ...this.history,
      new SessionHistory(SessionStatus.create(status), new Date(), reason),
    ];
  }

  private assertNotTerminalMutation(): void {
    if (this.status.isTerminal()) {
      throw new LearningSessionDomainError(
        'SESSION_TERMINAL_STATE_MUTATION_FORBIDDEN',
        'Learning session is in a terminal state and cannot be mutated',
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

  private buildMetadata(context: EventContext): LearningSessionEventMetadata {
    return {
      eventId: randomUUID(),
      aggregateId: this.sessionId,
      aggregateType: 'LearningSession',
      aggregateVersion: this.aggregateVersion,
      occurredAt: new Date().toISOString(),
      traceId: context.traceId,
      correlationId: context.correlationId,
      causationId: context.causationId,
    };
  }

  private recordEvent(event: LearningSessionDomainEvent): void {
    this.pendingEvents.push(event);
  }
}
