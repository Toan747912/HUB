import { Injectable } from '@nestjs/common';
import { Recommendation } from '../../domain/aggregates/recommendation.aggregate';
import { LearningStrategyCatalogEntry } from '../../domain/engine/learning-strategy-catalog';
import {
  LearningStrategyCatalogEntryResponseDto,
  RecommendationHistoryResponseDto,
  RecommendationListResponseDto,
  RecommendationResponseDto
} from '../dto/responses/recommendation.response.dto';

@Injectable()
export class RecommendationResponseMapper {
  toResponse(recommendation: Recommendation): RecommendationResponseDto {
    return {
      recommendationId: recommendation.getId(),
      goalId: recommendation.getGoalId(),
      roadmapId: recommendation.getRoadmapId(),
      assessmentId: recommendation.getAssessmentId(),
      learnerId: recommendation.getLearnerId(),
      status: recommendation.getStatus(),
      version: recommendation.getAggregateVersion(),
      engineVersion: recommendation.getEngineVersion(),
      items: recommendation.getItems().map((i) => ({
        id: i.id,
        type: i.type,
        skillArea: i.skillArea,
        taskId: i.taskId,
        strategy: i.strategy,
        priority: i.priority,
        scores: { ...i.scores },
        reason: { summary: i.reason.summary, evidence: [...i.reason.evidence] },
        affectedGoalId: i.affectedGoalId,
        affectedRoadmapId: i.affectedRoadmapId,
        affectedAssessmentId: i.affectedAssessmentId,
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
      }))
    };
  }

  toList(recommendations: Recommendation[]): RecommendationListResponseDto {
    const items = recommendations.map((r) => this.toResponse(r));
    return { items, total: items.length };
  }

  toHistory(recommendation: Recommendation): RecommendationHistoryResponseDto {
    return {
      recommendationId: recommendation.getId(),
      history: recommendation.getHistory().map((h) => ({
        version: h.version,
        reason: h.reason,
        engineVersion: h.engineVersion,
        itemCount: h.itemCount,
        averageConfidence: h.averageConfidence,
        createdAt: h.createdAt.toISOString()
      }))
    };
  }

  toStrategyCatalog(entries: LearningStrategyCatalogEntry[]): LearningStrategyCatalogEntryResponseDto[] {
    return entries.map((e) => ({ strategy: e.strategy, description: e.description }));
  }
}
