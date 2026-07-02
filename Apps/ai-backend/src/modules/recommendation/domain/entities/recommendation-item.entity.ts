import { AssessmentId, GoalId, RoadmapId, SkillId, TaskId } from '../../../../shared/domain/identifiers';
import { RecommendationReason } from './recommendation-reason.entity';
import { RecommendationScores } from './recommendation-scores';

export class RecommendationItem {
  constructor(
    public readonly id: string,
    public readonly type: string,
    public readonly skillId: SkillId | null,
    public readonly taskId: TaskId | null,
    public readonly strategy: string | null,
    public readonly priority: string,
    public readonly scores: RecommendationScores,
    public readonly reason: RecommendationReason,
    public readonly affectedGoalId: GoalId,
    public readonly affectedRoadmapId: RoadmapId,
    public readonly affectedAssessmentId: AssessmentId,
    public readonly logicalResourceRef: string | null = null
  ) {}
}
