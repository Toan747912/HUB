export type AssessmentTaskSignal = {
  id: string;
  skillArea: string;
  completed: boolean;
  estimatedDurationDays: number;
  actualDurationDays?: number;
};

export type AssessmentHistorySignal = {
  confidenceScore: number;
  readiness: string;
  computedAt: string;
};

export type AssessmentInput = {
  goalId: string;
  roadmapId: string;
  learnerId: string;
  roadmapCompletionRatio: number;
  tasks: AssessmentTaskSignal[];
  revisionCount: number;
  previousRuns: AssessmentHistorySignal[];
};

export type SkillScoreResult = {
  skillArea: string;
  rawScore: number;
  taskCount: number;
  completedTaskCount: number;
};

export type CompetencyResult = {
  skillArea: string;
  score: number;
  level: string;
};

export type KnowledgeGapResult = {
  id: string;
  skillArea: string;
  weight: string;
  reason: string;
};

export type ReadinessLevel = 'READY' | 'AT_RISK' | 'NOT_READY';

export type AssessmentComputation = {
  engineVersion: string;
  skillScores: SkillScoreResult[];
  competencies: CompetencyResult[];
  knowledgeGaps: KnowledgeGapResult[];
  confidenceScore: number;
  readiness: ReadinessLevel;
  weakAreas: string[];
  strongAreas: string[];
};
