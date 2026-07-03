import {
  RecommendationCompetencySignal,
  RecommendationGapSignal,
  RecommendationTaskSignal,
} from '../../domain/engine/recommendation-engine.types';

export class GenerateRecommendationsCommand {
  constructor(
    public readonly recommendationId: string,
    public readonly goalId: string,
    public readonly roadmapId: string,
    public readonly assessmentId: string,
    public readonly learnerId: string,
    public readonly goalPriority: string,
    public readonly goalDifficulty: string,
    public readonly targetDate: string,
    public readonly referenceDate: string,
    public readonly roadmapCompletionRatio: number,
    public readonly revisionCount: number,
    public readonly tasks: RecommendationTaskSignal[],
    public readonly competencies: RecommendationCompetencySignal[],
    public readonly knowledgeGaps: RecommendationGapSignal[],
    public readonly confidenceScore: number,
    public readonly readiness: string,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
