export class SkillScoreResponseDto {
  skillArea!: string;
  rawScore!: number;
  taskCount!: number;
  completedTaskCount!: number;
}

export class CompetencyResponseDto {
  skillArea!: string;
  score!: number;
  level!: string;
}

export class KnowledgeGapResponseDto {
  id!: string;
  skillArea!: string;
  weight!: string;
  reason!: string;
}

export class AssessmentResultResponseDto {
  skillScores!: SkillScoreResponseDto[];
  competencies!: CompetencyResponseDto[];
  knowledgeGaps!: KnowledgeGapResponseDto[];
  confidenceScore!: number;
  readiness!: string;
  weakAreas!: string[];
  strongAreas!: string[];
  engineVersion!: string;
}

export class AssessmentResponseDto {
  assessmentId!: string;
  goalId!: string;
  roadmapId!: string;
  learnerId!: string;
  status!: string;
  version!: number;
  result!: AssessmentResultResponseDto | null;
}

export class AssessmentListResponseDto {
  items!: AssessmentResponseDto[];
  total!: number;
}

export class CompetencyProfileResponseDto {
  assessmentId!: string;
  competencies!: CompetencyResponseDto[];
  weakAreas!: string[];
  strongAreas!: string[];
  confidenceScore!: number;
  readiness!: string;
}

export class KnowledgeGapsResponseDto {
  assessmentId!: string;
  gaps!: KnowledgeGapResponseDto[];
}
