import { randomUUID } from 'crypto';
import {
  AssessmentId,
  GoalId,
  LearnerId,
  RecommendationId,
  RoadmapId,
  SkillId,
  TaskId
} from '../../../../shared/domain/identifiers';
import { RecommendationItem } from '../entities/recommendation-item.entity';
import { RecommendationReason } from '../entities/recommendation-reason.entity';
import { RecommendationScores } from '../entities/recommendation-scores';
import { LearningStrategyAssignment } from '../entities/learning-strategy-assignment.entity';
import { ReviewSchedule } from '../entities/review-schedule.entity';
import { PriorityDecision } from '../entities/priority-decision.entity';
import { RecommendationHistory } from '../entities/recommendation-history.entity';
import {
  learningStrategyChangedEvent,
  recommendationApprovedEvent,
  recommendationArchivedEvent,
  recommendationGeneratedEvent,
  recommendationInvalidatedEvent,
  recommendationRejectedEvent
} from '../events/recommendation-events';
import { RecommendationDomainEvent, RecommendationEventMetadata } from '../events/recommendation-event-metadata';
import { ensureValidLifecycleTransition } from '../invariants/recommendation-lifecycle.invariant';
import { ensureExpectedVersion } from '../invariants/recommendation-version.invariant';
import { RecommendationStatus, RecommendationStatusValue } from '../value-objects/recommendation-status.vo';
import { RecommendationComputation } from '../engine/recommendation-engine.types';

type EventContext = {
  traceId: string;
  correlationId: string;
  causationId: string;
};

type RecommendationCreateProps = {
  recommendationId: RecommendationId;
  goalId: GoalId;
  roadmapId: RoadmapId;
  assessmentId: AssessmentId;
  learnerId: LearnerId;
  computation: RecommendationComputation;
};

export class Recommendation {
  private aggregateVersion = 0;
  private status: RecommendationStatus = RecommendationStatus.generated();
  private items: RecommendationItem[] = [];
  private learningStrategies: LearningStrategyAssignment[] = [];
  private reviewSchedules: ReviewSchedule[] = [];
  private priorityDecisions: PriorityDecision[] = [];
  private engineVersion = '';
  private history: RecommendationHistory[] = [];
  private invalidatedAt: Date | null = null;
  private pendingEvents: RecommendationDomainEvent[] = [];

  private constructor(
    private readonly recommendationId: RecommendationId,
    private readonly goalId: GoalId,
    private readonly roadmapId: RoadmapId,
    private readonly assessmentId: AssessmentId,
    private readonly learnerId: LearnerId
  ) {}

  static create(props: RecommendationCreateProps, context: EventContext): Recommendation {
    const aggregate = new Recommendation(props.recommendationId, props.goalId, props.roadmapId, props.assessmentId, props.learnerId);

    aggregate.engineVersion = props.computation.engineVersion;
    aggregate.items = props.computation.items.map(
      (i) =>
        new RecommendationItem(
          i.id,
          i.type,
          i.skillId ? SkillId.create(i.skillId) : null,
          i.taskId ? TaskId.create(i.taskId) : null,
          i.strategy,
          i.priority,
          new RecommendationScores(
            i.scores.priorityScore,
            i.scores.needScore,
            i.scores.urgencyScore,
            i.scores.difficultyScore,
            i.scores.confidenceScore,
            i.scores.riskScore,
            i.scores.overallScore
          ),
          new RecommendationReason(i.reason.summary, i.reason.evidence),
          GoalId.create(i.affectedGoalId),
          RoadmapId.create(i.affectedRoadmapId),
          AssessmentId.create(i.affectedAssessmentId),
          i.logicalResourceRef
        )
    );
    aggregate.learningStrategies = props.computation.learningStrategies.map(
      (s) => new LearningStrategyAssignment(SkillId.create(s.skillId), s.strategy, s.rationale)
    );
    aggregate.reviewSchedules = props.computation.reviewSchedules.map(
      (r) => new ReviewSchedule(SkillId.create(r.skillId), r.intervalDays, r.dueDate, r.reason)
    );
    aggregate.priorityDecisions = props.computation.priorityDecisions.map(
      (p) => new PriorityDecision(p.taskId, p.priorityScore, p.originalOrder, p.suggestedOrder, p.blocked, p.rationale)
    );

    aggregate.bumpVersion();
    aggregate.appendHistory('GENERATED', props.computation.overallConfidence);

    aggregate.recordEvent(
      recommendationGeneratedEvent(aggregate.buildMetadata(context), {
        goalId: props.goalId.toString(),
        roadmapId: props.roadmapId.toString(),
        assessmentId: props.assessmentId.toString(),
        itemCount: aggregate.items.length,
        averageConfidence: props.computation.overallConfidence
      })
    );

    if (aggregate.learningStrategies.length > 0) {
      aggregate.recordEvent(
        learningStrategyChangedEvent(aggregate.buildMetadata(context), {
          strategies: aggregate.learningStrategies.map((s) => ({ skillId: s.skillId.toString(), strategy: s.strategy, rationale: s.rationale }))
        })
      );
    }

    return aggregate;
  }

  getId(): RecommendationId {
    return this.recommendationId;
  }

  getGoalId(): GoalId {
    return this.goalId;
  }

  getRoadmapId(): RoadmapId {
    return this.roadmapId;
  }

  getAssessmentId(): AssessmentId {
    return this.assessmentId;
  }

  getLearnerId(): LearnerId {
    return this.learnerId;
  }

  getStatus(): RecommendationStatusValue {
    return this.status.getValue();
  }

  getAggregateVersion(): number {
    return this.aggregateVersion;
  }

  getEngineVersion(): string {
    return this.engineVersion;
  }

  getItems(): RecommendationItem[] {
    return [...this.items];
  }

  getLearningStrategies(): LearningStrategyAssignment[] {
    return [...this.learningStrategies];
  }

  getReviewSchedules(): ReviewSchedule[] {
    return [...this.reviewSchedules];
  }

  getPriorityDecisions(): PriorityDecision[] {
    return [...this.priorityDecisions];
  }

  getHistory(): RecommendationHistory[] {
    return [...this.history];
  }

  getInvalidatedAt(): Date | null {
    return this.invalidatedAt;
  }

  pullEvents(): RecommendationDomainEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }

  approve(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'APPROVED');
    this.bumpVersion();
    this.status = RecommendationStatus.create('APPROVED');
    this.appendHistory('APPROVED');
    this.recordEvent(recommendationApprovedEvent(this.buildMetadata(context), { previousStatus }));
  }

  reject(context: EventContext, reason: string | undefined, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'REJECTED');
    this.bumpVersion();
    this.status = RecommendationStatus.create('REJECTED');
    this.appendHistory('REJECTED');
    this.recordEvent(recommendationRejectedEvent(this.buildMetadata(context), { previousStatus, reason }));
  }

  archive(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'ARCHIVED');
    this.bumpVersion();
    this.status = RecommendationStatus.create('ARCHIVED');
    this.appendHistory('ARCHIVED');
    this.recordEvent(recommendationArchivedEvent(this.buildMetadata(context), { previousStatus }));
  }

  // Orthogonal staleness flag: independent of `status`'s lifecycle state
  // machine. Signals "something upstream changed, this may need to be
  // regenerated" without deciding what regeneration means or forcing a
  // lifecycle transition.
  invalidate(reason: string, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.bumpVersion();
    this.invalidatedAt = new Date();
    this.recordEvent(recommendationInvalidatedEvent(this.buildMetadata(context), { reason }));
  }

  private appendHistory(reason: 'GENERATED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED', averageConfidenceOverride?: number): void {
    const averageConfidence =
      averageConfidenceOverride ?? (this.items.length === 0 ? 0 : Math.round(this.items.reduce((sum, i) => sum + i.scores.confidenceScore, 0) / this.items.length));

    const entry = new RecommendationHistory(this.history.length + 1, reason, this.engineVersion, this.items.length, averageConfidence);
    this.history = [...this.history, entry];
  }

  private assertConcurrency(expectedVersion?: number): void {
    if (typeof expectedVersion === 'number') {
      ensureExpectedVersion(this.aggregateVersion, expectedVersion);
    }
  }

  private bumpVersion(): void {
    this.aggregateVersion += 1;
  }

  private buildMetadata(context: EventContext): RecommendationEventMetadata {
    return {
      eventId: randomUUID(),
      aggregateId: this.recommendationId,
      aggregateType: 'Recommendation',
      aggregateVersion: this.aggregateVersion,
      occurredAt: new Date().toISOString(),
      traceId: context.traceId,
      correlationId: context.correlationId,
      causationId: context.causationId,
      goalId: this.goalId,
      roadmapId: this.roadmapId,
      assessmentId: this.assessmentId,
      engineVersion: this.engineVersion
    };
  }

  private recordEvent(event: RecommendationDomainEvent): void {
    this.pendingEvents.push(event);
  }
}
