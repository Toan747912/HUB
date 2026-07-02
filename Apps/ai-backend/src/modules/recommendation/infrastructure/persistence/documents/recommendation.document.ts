export interface RecommendationScoresDoc {
  priorityScore: number;
  needScore: number;
  urgencyScore: number;
  difficultyScore: number;
  confidenceScore: number;
  riskScore: number;
  overallScore: number;
}

export interface RecommendationReasonDoc {
  summary: string;
  evidence: string[];
}

export interface RecommendationItemDoc {
  id: string;
  type: string;
  skillArea: string | null;
  taskId: string | null;
  strategy: string | null;
  priority: string;
  scores: RecommendationScoresDoc;
  reason: RecommendationReasonDoc;
  affectedGoalId: string;
  affectedRoadmapId: string;
  affectedAssessmentId: string;
  logicalResourceRef: string | null;
}

export interface LearningStrategyAssignmentDoc {
  skillArea: string;
  strategy: string;
  rationale: string;
}

export interface ReviewScheduleDoc {
  skillArea: string;
  intervalDays: number;
  dueDate: string;
  reason: string;
}

export interface PriorityDecisionDoc {
  taskId: string;
  priorityScore: number;
  originalOrder: number;
  suggestedOrder: number;
  blocked: boolean;
  rationale: string;
}

export interface RecommendationHistoryDoc {
  version: number;
  reason: string;
  engineVersion: string;
  itemCount: number;
  averageConfidence: number;
  createdAt: Date;
}

export interface RecommendationDocument {
  _id: string;
  goalId: string;
  roadmapId: string;
  assessmentId: string;
  learnerId: string;
  status: string;
  aggregateVersion: number;
  engineVersion: string;
  items: RecommendationItemDoc[];
  learningStrategies: LearningStrategyAssignmentDoc[];
  reviewSchedules: ReviewScheduleDoc[];
  priorityDecisions: PriorityDecisionDoc[];
  history: RecommendationHistoryDoc[];
  createdAt: Date;
  updatedAt: Date;
}
