export interface SkillScoreDoc {
  skillId: string;
  rawScore: number;
  taskCount: number;
  completedTaskCount: number;
}

export interface CompetencyDoc {
  skillId: string;
  score: number;
  level: string;
}

export interface KnowledgeGapDoc {
  id: string;
  skillId: string;
  weight: string;
  reason: string;
}

export interface AssessmentResultDoc {
  skillScores: SkillScoreDoc[];
  competencies: CompetencyDoc[];
  knowledgeGaps: KnowledgeGapDoc[];
  confidenceScore: number;
  readiness: string;
  weakAreas: string[];
  strongAreas: string[];
  engineVersion: string;
  computedAt: Date;
}

export interface AssessmentHistoryDoc {
  version: number;
  reason: string;
  engineVersion: string;
  confidenceScore: number;
  readiness: string;
  gapCount: number;
  createdAt: Date;
}

export interface AssessmentDocument {
  _id: string;
  goalId: string;
  roadmapId: string;
  learnerId: string;
  status: string;
  aggregateVersion: number;
  latestResult: AssessmentResultDoc | null;
  history: AssessmentHistoryDoc[];
  invalidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
