import { Competency } from './competency.entity';
import { KnowledgeGap } from './knowledge-gap.entity';
import { SkillScore } from './skill-score.entity';

export type ReadinessLevel = 'READY' | 'AT_RISK' | 'NOT_READY';

export class AssessmentResult {
  constructor(
    public readonly skillScores: SkillScore[],
    public readonly competencies: Competency[],
    public readonly knowledgeGaps: KnowledgeGap[],
    public readonly confidenceScore: number,
    public readonly readiness: ReadinessLevel,
    public readonly weakAreas: string[],
    public readonly strongAreas: string[],
    public readonly engineVersion: string,
    public readonly computedAt: Date = new Date(),
  ) {}
}
