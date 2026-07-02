export type RecommendationTaskSignal = {
  id: string;
  skillId: string;
  completed: boolean;
  order: number;
  dependsOn: string[];
  estimatedDurationDays: number;
  actualDurationDays?: number;
};

export type RecommendationCompetencySignal = {
  skillId: string;
  score: number;
  level: string;
};

export type RecommendationGapSignal = {
  skillId: string;
  weight: string;
  reason: string;
};

export type RecommendationInput = {
  goalId: string;
  roadmapId: string;
  assessmentId: string;
  learnerId: string;
  goalPriority: string;
  goalDifficulty: string;
  targetDate: string;
  referenceDate: string;
  roadmapCompletionRatio: number;
  revisionCount: number;
  tasks: RecommendationTaskSignal[];
  competencies: RecommendationCompetencySignal[];
  knowledgeGaps: RecommendationGapSignal[];
  confidenceScore: number;
  readiness: string;
};

export type RecommendationScoresResult = {
  priorityScore: number;
  needScore: number;
  urgencyScore: number;
  difficultyScore: number;
  confidenceScore: number;
  riskScore: number;
  overallScore: number;
};

export type RecommendationItemResult = {
  id: string;
  type: string;
  skillId: string | null;
  taskId: string | null;
  strategy: string | null;
  priority: string;
  scores: RecommendationScoresResult;
  reason: { summary: string; evidence: string[] };
  affectedGoalId: string;
  affectedRoadmapId: string;
  affectedAssessmentId: string;
  logicalResourceRef: string | null;
};

export type LearningStrategyResult = {
  skillId: string;
  strategy: string;
  rationale: string;
};

export type ReviewScheduleResult = {
  skillId: string;
  intervalDays: number;
  dueDate: string;
  reason: string;
};

export type PriorityDecisionResult = {
  taskId: string;
  priorityScore: number;
  originalOrder: number;
  suggestedOrder: number;
  blocked: boolean;
  rationale: string;
};

export type RecommendationComputation = {
  engineVersion: string;
  items: RecommendationItemResult[];
  learningStrategies: LearningStrategyResult[];
  reviewSchedules: ReviewScheduleResult[];
  priorityDecisions: PriorityDecisionResult[];
  overallConfidence: number;
};
