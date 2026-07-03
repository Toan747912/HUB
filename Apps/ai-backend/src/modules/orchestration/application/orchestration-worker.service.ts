import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainEvent } from '../../../infrastructure/outbox/domain-event.contract';
import { QueueService } from '../../../infrastructure/jobs/queue.service';
import { RoadmapCommandService } from '../../roadmap/application/services/roadmap-command.service';
import { RoadmapQueryService } from '../../roadmap/application/services/roadmap-query.service';
import { InvalidateRoadmapCommand } from '../../roadmap/application/commands/invalidate-roadmap.command';
import { GetRoadmapsByGoalIdQuery } from '../../roadmap/application/queries/get-roadmaps-by-goal-id.query';
import { AssessmentCommandService } from '../../assessment/application/services/assessment-command.service';
import { AssessmentQueryService } from '../../assessment/application/services/assessment-query.service';
import { InvalidateAssessmentCommand } from '../../assessment/application/commands/invalidate-assessment.command';
import { GetAssessmentsByRoadmapIdQuery } from '../../assessment/application/queries/get-assessments-by-roadmap-id.query';
import { RecommendationCommandService } from '../../recommendation/application/services/recommendation-command.service';
import { RecommendationQueryService } from '../../recommendation/application/services/recommendation-query.service';
import { InvalidateRecommendationCommand } from '../../recommendation/application/commands/invalidate-recommendation.command';
import { GetRecommendationsByAssessmentIdQuery } from '../../recommendation/application/queries/get-recommendations-by-assessment-id.query';
import { LearningSessionQueryService } from '../../learning-session/application/services/learning-session-query.service';
import { GetLearningSessionQuery } from '../../learning-session/application/queries/get-learning-session.query';
import { RunAssessmentCommand } from '../../assessment/application/commands/run-assessment.command';

// Event types that trigger each downstream invalidation step. Everything
// else flowing through the queue (e.g. GoalConstraintChanged,
// RoadmapArchived's own cascade, the *Invalidated events this service itself
// produces) is intentionally ignored — the orchestration layer only reacts
// to events that represent a real upstream change, never to its own output,
// which would otherwise create an invalidation loop.
const GOAL_TRIGGER_EVENTS = new Set([
  'GoalCreated',
  'GoalUpdated',
  'GoalCompleted',
  'GoalArchived',
]);
const ROADMAP_TRIGGER_EVENTS = new Set([
  'RoadmapCreated',
  'RoadmapUpdated',
  'RoadmapPublished',
  'RoadmapRegenerated',
  'RoadmapInvalidated',
]);
const ASSESSMENT_TRIGGER_EVENTS = new Set([
  'AssessmentCreated',
  'AssessmentCompleted',
  'CompetencyUpdated',
  'KnowledgeGapDetected',
  'AssessmentInvalidated',
]);
const SESSION_TRIGGER_EVENTS = new Set([
  'LearningSessionCreated',
  'LearningSessionStarted',
  'LearningSessionPaused',
  'LearningSessionResumed',
  'LearningSessionCompleted',
  'LearningSessionCancelled',
  'EvidenceRecorded',
  'ProgressUpdated',
]);

/**
 * Platform orchestration (WP-06C Workstream F): event-driven, cross-module
 * staleness propagation. Never touches another module's aggregate or
 * repository directly — every cross-module effect goes through that
 * module's own application-layer command/query services (injected via
 * NestJS DI through RoadmapModule/AssessmentModule/RecommendationModule),
 * which are the only things allowed to call that module's aggregate.
 *
 * Wiring: registers itself as an in-process handler on the shared
 * QueueService (see QueueService#registerHandler) instead of opening a
 * second BullMQ Worker on GOAL_EVENTS_QUEUE. All modules' outbox events
 * already relay onto that single queue (OutboxRelayService / each module's
 * OutboxPublisherService), and QueueService already owns the sole Worker
 * consuming it — two independent Workers on the same queue name would
 * compete for jobs (BullMQ's horizontal-scaling semantics) and each event
 * would land on only one of them, silently dropping roughly half of the
 * orchestration triggers. Registering a handler guarantees every relayed
 * event reaches this service exactly once, in the existing worker.
 */
@Injectable()
export class OrchestrationWorkerService implements OnModuleInit {
  private readonly logger = new Logger(OrchestrationWorkerService.name);

  constructor(
    private readonly queue: QueueService,
    private readonly roadmapCommandService: RoadmapCommandService,
    private readonly roadmapQueryService: RoadmapQueryService,
    private readonly assessmentCommandService: AssessmentCommandService,
    private readonly assessmentQueryService: AssessmentQueryService,
    private readonly recommendationCommandService: RecommendationCommandService,
    private readonly recommendationQueryService: RecommendationQueryService,
    private readonly learningSessionQueryService: LearningSessionQueryService,
  ) {}

  onModuleInit(): void {
    this.queue.registerHandler((event) => this.handleEvent(event));
  }

  async handleEvent(event: DomainEvent): Promise<void> {
    if (GOAL_TRIGGER_EVENTS.has(event.type)) {
      await this.handleGoalEvent(event);
      return;
    }
    if (ROADMAP_TRIGGER_EVENTS.has(event.type)) {
      await this.handleRoadmapEvent(event);
      return;
    }
    if (ASSESSMENT_TRIGGER_EVENTS.has(event.type)) {
      await this.handleAssessmentEvent(event);
      return;
    }
    if (SESSION_TRIGGER_EVENTS.has(event.type)) {
      await this.handleSessionEvent(event);
    }
  }

  private async handleGoalEvent(event: DomainEvent): Promise<void> {
    const goalId = event.metadata.aggregateId.toString();
    const roadmaps = await this.roadmapQueryService.getRoadmapsByGoalId(
      new GetRoadmapsByGoalIdQuery(goalId),
    );

    for (const roadmap of roadmaps) {
      try {
        await this.roadmapCommandService.invalidateRoadmap(
          new InvalidateRoadmapCommand(
            roadmap.getId().toString(),
            `Upstream Goal event: ${event.type}`,
            undefined,
            event.metadata.traceId,
            event.metadata.correlationId,
            event.metadata.eventId,
          ),
        );
      } catch (error) {
        this.logWarn(
          'goal_to_roadmap_invalidation_failed',
          event,
          roadmap.getId().toString(),
          error,
        );
      }
    }
  }

  private async handleRoadmapEvent(event: DomainEvent): Promise<void> {
    const roadmapId = event.metadata.aggregateId.toString();
    const assessments = await this.assessmentQueryService.getAssessmentsByRoadmapId(
      new GetAssessmentsByRoadmapIdQuery(roadmapId),
    );

    for (const assessment of assessments) {
      try {
        await this.assessmentCommandService.invalidateAssessment(
          new InvalidateAssessmentCommand(
            assessment.getId().toString(),
            `Upstream Roadmap event: ${event.type}`,
            undefined,
            event.metadata.traceId,
            event.metadata.correlationId,
            event.metadata.eventId,
          ),
        );
      } catch (error) {
        this.logWarn(
          'roadmap_to_assessment_invalidation_failed',
          event,
          assessment.getId().toString(),
          error,
        );
      }
    }
  }

  private async handleAssessmentEvent(event: DomainEvent): Promise<void> {
    const assessmentId = event.metadata.aggregateId.toString();
    const recommendations = await this.recommendationQueryService.getRecommendationsByAssessmentId(
      new GetRecommendationsByAssessmentIdQuery(assessmentId),
    );

    for (const recommendation of recommendations) {
      try {
        await this.recommendationCommandService.invalidateRecommendation(
          new InvalidateRecommendationCommand(
            recommendation.getId().toString(),
            `Upstream Assessment event: ${event.type}`,
            undefined,
            event.metadata.traceId,
            event.metadata.correlationId,
            event.metadata.eventId,
          ),
        );
      } catch (error) {
        this.logWarn(
          'assessment_to_recommendation_invalidation_failed',
          event,
          recommendation.getId().toString(),
          error,
        );
      }
    }
  }

  private async handleSessionEvent(event: DomainEvent): Promise<void> {
    if (event.type !== 'EvidenceRecorded') {
      return;
    }

    const sessionId = event.metadata.aggregateId.toString();
    const session = await this.learningSessionQueryService.getSession(
      new GetLearningSessionQuery(sessionId),
    );
    if (!session || !session.getAssessmentId()) {
      return;
    }

    try {
      let revisionCount = 0;
      session.getEvidence().forEach((e) => {
        revisionCount += e.revisionCount;
      });

      await this.assessmentCommandService.runAssessment(
        new RunAssessmentCommand(
          session.getAssessmentId()!.toString(),
          session.getProgress().completionRate * 100,
          session.getTasks().map((t) => ({
            id: t.id,
            skillId: t.skillId.toString(),
            completed: t.completed,
            estimatedDurationDays: 1,
            actualDurationDays: t.completedAt ? 1 : undefined,
          })),
          revisionCount,
          [],
          undefined,
          event.metadata.traceId,
          event.metadata.correlationId,
          event.metadata.eventId,
        ),
      );
    } catch (error) {
      this.logWarn(
        'session_evidence_to_assessment_failed',
        event,
        session.getAssessmentId()!.toString(),
        error,
      );
    }
  }

  private logWarn(
    reasonEvent: string,
    sourceEvent: DomainEvent,
    targetAggregateId: string,
    error: unknown,
  ): void {
    this.logger.warn(
      JSON.stringify({
        event: reasonEvent,
        sourceEventType: sourceEvent.type,
        sourceEventId: sourceEvent.metadata.eventId,
        targetAggregateId,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
