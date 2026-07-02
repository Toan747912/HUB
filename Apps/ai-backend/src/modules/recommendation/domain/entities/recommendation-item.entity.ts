import { RecommendationReason } from './recommendation-reason.entity';
import { RecommendationScores } from './recommendation-scores';

export class RecommendationItem {
  constructor(
    public readonly id: string,
    public readonly type: string,
    public readonly skillArea: string | null,
    public readonly taskId: string | null,
    public readonly strategy: string | null,
    public readonly priority: string,
    public readonly scores: RecommendationScores,
    public readonly reason: RecommendationReason,
    public readonly affectedGoalId: string,
    public readonly affectedRoadmapId: string,
    public readonly affectedAssessmentId: string,
    public readonly logicalResourceRef: string | null = null
  ) {}
}
