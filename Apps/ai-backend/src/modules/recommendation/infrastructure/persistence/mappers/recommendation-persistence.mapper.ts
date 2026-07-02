import {
  AssessmentId,
  GoalId,
  LearnerId,
  RecommendationId,
  RoadmapId,
  TaskId
} from '../../../../../shared/domain/identifiers';
import { Recommendation } from '../../../domain/aggregates/recommendation.aggregate';
import { RecommendationItem } from '../../../domain/entities/recommendation-item.entity';
import { RecommendationReason } from '../../../domain/entities/recommendation-reason.entity';
import { RecommendationScores } from '../../../domain/entities/recommendation-scores';
import { LearningStrategyAssignment } from '../../../domain/entities/learning-strategy-assignment.entity';
import { ReviewSchedule } from '../../../domain/entities/review-schedule.entity';
import { PriorityDecision } from '../../../domain/entities/priority-decision.entity';
import { RecommendationHistory, RecommendationHistoryReason } from '../../../domain/entities/recommendation-history.entity';
import { RecommendationStatus } from '../../../domain/value-objects/recommendation-status.vo';
import { RecommendationDocument } from '../documents/recommendation.document';

export class RecommendationPersistenceMapper {
  static toDocument(recommendation: Recommendation): RecommendationDocument {
    return {
      _id: recommendation.getId().toString(),
      goalId: recommendation.getGoalId().toString(),
      roadmapId: recommendation.getRoadmapId().toString(),
      assessmentId: recommendation.getAssessmentId().toString(),
      learnerId: recommendation.getLearnerId().toString(),
      status: recommendation.getStatus(),
      aggregateVersion: recommendation.getAggregateVersion(),
      engineVersion: recommendation.getEngineVersion(),
      items: recommendation.getItems().map((i) => ({
        id: i.id,
        type: i.type,
        skillArea: i.skillArea,
        taskId: i.taskId ? i.taskId.toString() : null,
        strategy: i.strategy,
        priority: i.priority,
        scores: { ...i.scores },
        reason: { summary: i.reason.summary, evidence: [...i.reason.evidence] },
        affectedGoalId: i.affectedGoalId.toString(),
        affectedRoadmapId: i.affectedRoadmapId.toString(),
        affectedAssessmentId: i.affectedAssessmentId.toString(),
        logicalResourceRef: i.logicalResourceRef
      })),
      learningStrategies: recommendation.getLearningStrategies().map((s) => ({
        skillArea: s.skillArea,
        strategy: s.strategy,
        rationale: s.rationale
      })),
      reviewSchedules: recommendation.getReviewSchedules().map((r) => ({
        skillArea: r.skillArea,
        intervalDays: r.intervalDays,
        dueDate: r.dueDate,
        reason: r.reason
      })),
      priorityDecisions: recommendation.getPriorityDecisions().map((p) => ({
        taskId: p.taskId,
        priorityScore: p.priorityScore,
        originalOrder: p.originalOrder,
        suggestedOrder: p.suggestedOrder,
        blocked: p.blocked,
        rationale: p.rationale
      })),
      history: recommendation.getHistory().map((h) => ({
        version: h.version,
        reason: h.reason,
        engineVersion: h.engineVersion,
        itemCount: h.itemCount,
        averageConfidence: h.averageConfidence,
        createdAt: h.createdAt
      })),
      invalidatedAt: recommendation.getInvalidatedAt(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // TypeScript private fields are compile-time only; direct property assignment
  // is the accepted reconstitution pattern when the aggregate has no static reconstruct factory.
  static toDomain(doc: RecommendationDocument): Recommendation {
    const recommendation = Object.create(Recommendation.prototype) as Recommendation;

    (recommendation as any).recommendationId = RecommendationId.create(doc._id);
    (recommendation as any).goalId = GoalId.create(doc.goalId);
    (recommendation as any).roadmapId = RoadmapId.create(doc.roadmapId);
    (recommendation as any).assessmentId = AssessmentId.create(doc.assessmentId);
    (recommendation as any).learnerId = LearnerId.create(doc.learnerId);
    (recommendation as any).status = RecommendationStatus.create(doc.status);
    (recommendation as any).aggregateVersion = doc.aggregateVersion;
    (recommendation as any).engineVersion = doc.engineVersion;
    (recommendation as any).pendingEvents = [];
    (recommendation as any).invalidatedAt = doc.invalidatedAt ?? null;

    (recommendation as any).items = doc.items.map(
      (i) =>
        new RecommendationItem(
          i.id,
          i.type,
          i.skillArea,
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

    (recommendation as any).learningStrategies = doc.learningStrategies.map(
      (s) => new LearningStrategyAssignment(s.skillArea, s.strategy, s.rationale)
    );

    (recommendation as any).reviewSchedules = doc.reviewSchedules.map(
      (r) => new ReviewSchedule(r.skillArea, r.intervalDays, r.dueDate, r.reason)
    );

    (recommendation as any).priorityDecisions = doc.priorityDecisions.map(
      (p) => new PriorityDecision(p.taskId, p.priorityScore, p.originalOrder, p.suggestedOrder, p.blocked, p.rationale)
    );

    (recommendation as any).history = doc.history.map(
      (h) =>
        new RecommendationHistory(
          h.version,
          h.reason as RecommendationHistoryReason,
          h.engineVersion,
          h.itemCount,
          h.averageConfidence,
          h.createdAt
        )
    );

    return recommendation;
  }
}
