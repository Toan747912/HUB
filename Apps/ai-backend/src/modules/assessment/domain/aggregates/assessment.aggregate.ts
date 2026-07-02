import { randomUUID } from 'crypto';
import { AssessmentId, GoalId, LearnerId, RoadmapId } from '../../../../shared/domain/identifiers';
import { AssessmentResult } from '../entities/assessment-result.entity';
import { Competency } from '../entities/competency.entity';
import { KnowledgeGap } from '../entities/knowledge-gap.entity';
import { SkillScore } from '../entities/skill-score.entity';
import { AssessmentHistory } from '../entities/assessment-history.entity';
import {
  assessmentArchivedEvent,
  assessmentCompletedEvent,
  assessmentCreatedEvent,
  assessmentInvalidatedEvent,
  competencyUpdatedEvent,
  knowledgeGapDetectedEvent
} from '../events/assessment-events';
import { AssessmentDomainEvent, AssessmentEventMetadata } from '../events/assessment-event-metadata';
import { AssessmentDomainError } from '../errors/assessment-domain.error';
import { ensureValidLifecycleTransition } from '../invariants/assessment-lifecycle.invariant';
import { ensureExpectedVersion } from '../invariants/assessment-version.invariant';
import { AssessmentStatus, AssessmentStatusValue } from '../value-objects/assessment-status.vo';
import { AssessmentComputation } from '../engine/assessment-engine.types';

type EventContext = {
  traceId: string;
  correlationId: string;
  causationId: string;
};

type AssessmentCreateProps = {
  assessmentId: AssessmentId;
  goalId: GoalId;
  roadmapId: RoadmapId;
  learnerId: LearnerId;
};

export class Assessment {
  private aggregateVersion = 0;
  private status: AssessmentStatus = AssessmentStatus.draft();
  private latestResult: AssessmentResult | null = null;
  private history: AssessmentHistory[] = [];
  private invalidatedAt: Date | null = null;
  private pendingEvents: AssessmentDomainEvent[] = [];

  private constructor(
    private readonly assessmentId: AssessmentId,
    private readonly goalId: GoalId,
    private readonly roadmapId: RoadmapId,
    private readonly learnerId: LearnerId
  ) {}

  static create(props: AssessmentCreateProps, context: EventContext): Assessment {
    const aggregate = new Assessment(props.assessmentId, props.goalId, props.roadmapId, props.learnerId);
    aggregate.bumpVersion();
    aggregate.appendHistory('CREATED');

    aggregate.recordEvent(
      assessmentCreatedEvent(aggregate.buildMetadata(context), {
        goalId: props.goalId.toString(),
        roadmapId: props.roadmapId.toString(),
        learnerId: props.learnerId.toString(),
        status: aggregate.status.getValue()
      })
    );

    return aggregate;
  }

  getId(): AssessmentId {
    return this.assessmentId;
  }

  getGoalId(): GoalId {
    return this.goalId;
  }

  getRoadmapId(): RoadmapId {
    return this.roadmapId;
  }

  getLearnerId(): LearnerId {
    return this.learnerId;
  }

  getStatus(): AssessmentStatusValue {
    return this.status.getValue();
  }

  getAggregateVersion(): number {
    return this.aggregateVersion;
  }

  getLatestResult(): AssessmentResult | null {
    return this.latestResult;
  }

  getHistory(): AssessmentHistory[] {
    return [...this.history];
  }

  getInvalidatedAt(): Date | null {
    return this.invalidatedAt;
  }

  pullEvents(): AssessmentDomainEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }

  run(computation: AssessmentComputation, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);

    if (this.status.isLockedForRun()) {
      throw new AssessmentDomainError('ASSESSMENT_LOCKED_FOR_RUN', 'Assessment is APPROVED or ARCHIVED and cannot be re-run');
    }

    if (this.status.getValue() === 'DRAFT') {
      ensureValidLifecycleTransition('DRAFT', 'COMPLETED');
      this.status = AssessmentStatus.create('COMPLETED');
    }

    this.bumpVersion();

    this.latestResult = new AssessmentResult(
      computation.skillScores.map((s) => new SkillScore(s.skillArea, s.rawScore, s.taskCount, s.completedTaskCount)),
      computation.competencies.map((c) => new Competency(c.skillArea, c.score, c.level)),
      computation.knowledgeGaps.map((g) => new KnowledgeGap(g.id, g.skillArea, g.weight, g.reason)),
      computation.confidenceScore,
      computation.readiness,
      computation.weakAreas,
      computation.strongAreas,
      computation.engineVersion
    );

    this.appendHistory('RUN');

    this.recordEvent(
      assessmentCompletedEvent(this.buildMetadata(context), {
        confidenceScore: computation.confidenceScore,
        readiness: computation.readiness,
        gapCount: computation.knowledgeGaps.length
      })
    );

    this.recordEvent(
      competencyUpdatedEvent(this.buildMetadata(context), {
        competencies: computation.competencies,
        weakAreas: computation.weakAreas,
        strongAreas: computation.strongAreas
      })
    );

    if (computation.knowledgeGaps.length > 0) {
      this.recordEvent(
        knowledgeGapDetectedEvent(this.buildMetadata(context), {
          gaps: computation.knowledgeGaps.map((g) => ({ skillArea: g.skillArea, weight: g.weight, reason: g.reason }))
        })
      );
    }
  }

  approve(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);

    if (!this.latestResult) {
      throw new AssessmentDomainError('ASSESSMENT_NOT_RUN_YET', 'Assessment must be run at least once before it can be approved');
    }

    ensureValidLifecycleTransition(this.status.getValue(), 'APPROVED');
    this.bumpVersion();
    this.status = AssessmentStatus.create('APPROVED');
    this.appendHistory('APPROVED');
  }

  archive(context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    const previousStatus = this.status.getValue();
    ensureValidLifecycleTransition(previousStatus, 'ARCHIVED');
    this.bumpVersion();
    this.status = AssessmentStatus.create('ARCHIVED');
    this.appendHistory('ARCHIVED');
    this.recordEvent(assessmentArchivedEvent(this.buildMetadata(context), { previousStatus }));
  }

  // Orthogonal staleness flag: independent of `status`'s lifecycle state
  // machine. Signals "something upstream changed, this may need to be
  // regenerated" without deciding what regeneration means or forcing a
  // lifecycle transition. Intentionally not gated by the "locked for run"
  // check — an approved/archived assessment can still be flagged stale.
  invalidate(reason: string, context: EventContext, expectedVersion?: number): void {
    this.assertConcurrency(expectedVersion);
    this.bumpVersion();
    this.invalidatedAt = new Date();
    this.recordEvent(assessmentInvalidatedEvent(this.buildMetadata(context), { reason }));
  }

  private appendHistory(reason: 'CREATED' | 'RUN' | 'APPROVED' | 'ARCHIVED'): void {
    const entry = new AssessmentHistory(
      this.history.length + 1,
      reason,
      this.latestResult?.engineVersion ?? '',
      this.latestResult?.confidenceScore ?? 0,
      this.latestResult?.readiness ?? 'NOT_READY',
      this.latestResult?.knowledgeGaps.length ?? 0
    );
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

  private buildMetadata(context: EventContext): AssessmentEventMetadata {
    return {
      eventId: randomUUID(),
      aggregateId: this.assessmentId,
      aggregateType: 'Assessment',
      aggregateVersion: this.aggregateVersion,
      occurredAt: new Date().toISOString(),
      traceId: context.traceId,
      correlationId: context.correlationId,
      causationId: context.causationId,
      goalId: this.goalId,
      roadmapId: this.roadmapId,
      engineVersion: this.latestResult?.engineVersion ?? ''
    };
  }

  private recordEvent(event: AssessmentDomainEvent): void {
    this.pendingEvents.push(event);
  }
}
