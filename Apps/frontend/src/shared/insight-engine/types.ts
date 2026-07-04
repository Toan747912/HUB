export type InsightCategory =
  | "TODAYS_MISSION"
  | "LEARNING_PROGRESS"
  | "LEARNING_CONSISTENCY"
  | "FOCUS_TREND"
  | "KNOWLEDGE_GROWTH"
  | "KNOWLEDGE_GAPS"
  | "RECOMMENDATION_EXPLANATION"
  | "ROADMAP_PROGRESS"
  | "WEEKLY_SUMMARY"
  | "MONTHLY_SUMMARY"
  | "ACHIEVEMENT_HIGHLIGHTS"
  | "RISK_DETECTION";

export type InsightPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

export interface Insight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  /** "So what" / supporting bullets shown under the title. */
  reasons: string[];
  /** Rule ids that fired, for observability only — never learner content. */
  rulesTriggered: string[];
}

export interface EvidenceRecordLike {
  id?: string;
  completedTasks?: number;
  timeSpent?: number;
  completionRate?: number;
  interruptions?: number;
  revisionCount?: number;
  focusScore?: number;
  engagementScore?: number;
  recordedAt?: string | Date;
}

export interface SessionTimerLike {
  startedAt?: string | Date;
  elapsedSeconds?: number;
}

export interface SessionReflectionLike {
  content?: string;
  rating?: number;
  recordedAt?: string | Date;
}

export interface SessionProgressLike {
  completedTasksCount?: number;
  totalTasksCount?: number;
  completionRate?: number;
  lastUpdatedAt?: string | Date;
}

export interface SessionTaskLike {
  id?: string;
  title?: string;
  completed?: boolean;
  completedAt?: string | Date | null;
  skillId?: string;
}

export interface SessionLike {
  sessionId?: string;
  goalId?: string;
  status?: string;
  skillId?: string;
  timers?: SessionTimerLike[];
  evidence?: EvidenceRecordLike[];
  reflection?: SessionReflectionLike | null;
  progress?: SessionProgressLike;
  tasks?: SessionTaskLike[];
}

export interface GoalMilestoneLike {
  id?: string;
  title?: string;
  reached?: boolean;
  reachedAt?: string | Date;
}

export interface GoalLike {
  goalId?: string;
  title?: string;
  status?: string;
  milestones?: GoalMilestoneLike[];
  progress?: { completionRatio?: number; reachedMilestoneIds?: string[] };
}

export interface RoadmapTaskLike {
  id?: string;
  title?: string;
  order?: number;
  dependsOn?: string[];
  estimatedDurationDays?: number;
  completed?: boolean;
  completedAt?: string | Date;
  skillId?: string;
}

export interface RoadmapMilestoneLike {
  id?: string;
  title?: string;
  order?: number;
  tasks?: RoadmapTaskLike[];
  reached?: boolean;
  reachedAt?: string | Date;
}

export interface RoadmapLike {
  roadmapId?: string;
  goalId?: string;
  status?: string;
  milestones?: RoadmapMilestoneLike[];
  progress?: { completionRatio?: number; completedTaskIds?: string[] };
}

export interface SkillScoreLike {
  skillId?: string;
  rawScore?: number;
  taskCount?: number;
  completedTaskCount?: number;
}

export interface CompetencyLike {
  skillId?: string;
  score?: number;
  level?: string;
}

export interface KnowledgeGapLike {
  id?: string;
  skillId?: string;
  weight?: string;
  reason?: string;
}

export interface AssessmentLike {
  assessmentId?: string;
  learnerId?: string;
  skillScores?: SkillScoreLike[];
  competencies?: CompetencyLike[];
  knowledgeGaps?: KnowledgeGapLike[];
  confidenceScore?: number;
  readiness?: "READY" | "AT_RISK" | "NOT_READY" | string;
  weakAreas?: string[];
  strongAreas?: string[];
  computedAt?: string | Date;
}

export interface RecommendationReasonLike {
  summary?: string;
  evidence?: string[];
}

export interface RecommendationScoresLike {
  priorityScore?: number;
  needScore?: number;
  urgencyScore?: number;
  difficultyScore?: number;
  confidenceScore?: number;
  riskScore?: number;
  overallScore?: number;
}

export interface RecommendationItemLike {
  id?: string;
  type?: string;
  skillId?: string | null;
  taskId?: string | null;
  strategy?: string | null;
  priority?: string;
  scores?: RecommendationScoresLike;
  reason?: RecommendationReasonLike;
  affectedGoalId?: string;
  affectedRoadmapId?: string;
  affectedAssessmentId?: string;
}

export interface RecommendationPlanLike {
  recommendationId?: string;
  status?: string;
  engineVersion?: string;
  items?: RecommendationItemLike[];
}

export interface InsightEngineInput {
  now: Date;
  goals: GoalLike[];
  roadmaps: RoadmapLike[];
  assessments: AssessmentLike[];
  recommendationPlans: RecommendationPlanLike[];
  sessions: SessionLike[];
}
