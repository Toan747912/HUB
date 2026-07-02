export class RecommendationScoresResponseDto {
  priorityScore!: number;
  needScore!: number;
  urgencyScore!: number;
  difficultyScore!: number;
  confidenceScore!: number;
  riskScore!: number;
  overallScore!: number;
}

export class RecommendationReasonResponseDto {
  summary!: string;
  evidence!: string[];
}

export class RecommendationItemResponseDto {
  id!: string;
  type!: string;
  skillId!: string | null;
  taskId!: string | null;
  strategy!: string | null;
  priority!: string;
  scores!: RecommendationScoresResponseDto;
  reason!: RecommendationReasonResponseDto;
  affectedGoalId!: string;
  affectedRoadmapId!: string;
  affectedAssessmentId!: string;
  logicalResourceRef!: string | null;
}

export class LearningStrategyAssignmentResponseDto {
  skillId!: string;
  strategy!: string;
  rationale!: string;
}

export class ReviewScheduleResponseDto {
  skillId!: string;
  intervalDays!: number;
  dueDate!: string;
  reason!: string;
}

export class PriorityDecisionResponseDto {
  taskId!: string;
  priorityScore!: number;
  originalOrder!: number;
  suggestedOrder!: number;
  blocked!: boolean;
  rationale!: string;
}

export class RecommendationResponseDto {
  recommendationId!: string;
  goalId!: string;
  roadmapId!: string;
  assessmentId!: string;
  learnerId!: string;
  status!: string;
  version!: number;
  engineVersion!: string;
  items!: RecommendationItemResponseDto[];
  learningStrategies!: LearningStrategyAssignmentResponseDto[];
  reviewSchedules!: ReviewScheduleResponseDto[];
  priorityDecisions!: PriorityDecisionResponseDto[];
}

export class RecommendationListResponseDto {
  items!: RecommendationResponseDto[];
  total!: number;
}

export class RecommendationHistoryEntryResponseDto {
  version!: number;
  reason!: string;
  engineVersion!: string;
  itemCount!: number;
  averageConfidence!: number;
  createdAt!: string;
}

export class RecommendationHistoryResponseDto {
  recommendationId!: string;
  history!: RecommendationHistoryEntryResponseDto[];
}

export class LearningStrategyCatalogEntryResponseDto {
  strategy!: string;
  description!: string;
}
