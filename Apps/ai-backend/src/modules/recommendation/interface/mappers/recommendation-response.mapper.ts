import { Injectable } from '@nestjs/common';
import { Recommendation } from '../../domain/aggregates/recommendation.aggregate';
import { LearningStrategyCatalogEntry } from '../../domain/engine/learning-strategy-catalog';
import {
  LearningStrategyCatalogEntryResponseDto,
  RecommendationHistoryResponseDto,
  RecommendationListResponseDto,
  RecommendationResponseDto,
} from '../dto/responses/recommendation.response.dto';

@Injectable()
export class RecommendationResponseMapper {
  toResponse(recommendation: Recommendation): RecommendationResponseDto {
    return {
      recommendationId: recommendation.getId().toString(),
      goalId: recommendation.getGoalId().toString(),
      roadmapId: recommendation.getRoadmapId().toString(),
      assessmentId: recommendation.getAssessmentId().toString(),
      learnerId: recommendation.getLearnerId().toString(),
      status: recommendation.getStatus(),
      version: recommendation.getAggregateVersion(),
      engineVersion: recommendation.getEngineVersion(),
      items: recommendation.getItems().map((i) => ({
        id: i.id,
        type: i.type,
        skillId: i.skillId ? i.skillId.toString() : null,
        taskId: i.taskId ? i.taskId.toString() : null,
        strategy: i.strategy,
        priority: i.priority,
        scores: { ...i.scores },
        reason: { summary: i.reason.summary, evidence: [...i.reason.evidence] },
        affectedGoalId: i.affectedGoalId.toString(),
        affectedRoadmapId: i.affectedRoadmapId.toString(),
        affectedAssessmentId: i.affectedAssessmentId.toString(),
        logicalResourceRef: i.logicalResourceRef,
      })),
      learningStrategies: recommendation.getLearningStrategies().map((s) => ({
        skillId: s.skillId.toString(),
        strategy: s.strategy,
        rationale: s.rationale,
      })),
      reviewSchedules: recommendation.getReviewSchedules().map((r) => ({
        skillId: r.skillId.toString(),
        intervalDays: r.intervalDays,
        dueDate: r.dueDate,
        reason: r.reason,
      })),
      priorityDecisions: recommendation.getPriorityDecisions().map((p) => ({
        taskId: p.taskId,
        priorityScore: p.priorityScore,
        originalOrder: p.originalOrder,
        suggestedOrder: p.suggestedOrder,
        blocked: p.blocked,
        rationale: p.rationale,
      })),
    };
  }

  toList(recommendations: Recommendation[]): RecommendationListResponseDto {
    const items = recommendations.map((r) => this.toResponse(r));
    return { items, total: items.length };
  }

  toHistory(recommendation: Recommendation): RecommendationHistoryResponseDto {
    return {
      recommendationId: recommendation.getId().toString(),
      history: recommendation.getHistory().map((h) => ({
        version: h.version,
        reason: h.reason,
        engineVersion: h.engineVersion,
        itemCount: h.itemCount,
        averageConfidence: h.averageConfidence,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  toStrategyCatalog(
    entries: LearningStrategyCatalogEntry[],
  ): LearningStrategyCatalogEntryResponseDto[] {
    return entries.map((e) => ({ strategy: e.strategy, description: e.description }));
  }
}
