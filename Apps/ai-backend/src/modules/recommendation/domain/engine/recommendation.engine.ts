import { LearningStrategyValue } from '../../../../shared/domain/vocabulary/learning-strategy.vo';
import { Priority } from '../../../../shared/domain/vocabulary/priority.vo';
import {
  LearningStrategyResult,
  PriorityDecisionResult,
  RecommendationCompetencySignal,
  RecommendationComputation,
  RecommendationGapSignal,
  RecommendationInput,
  RecommendationItemResult,
  RecommendationScoresResult,
  RecommendationTaskSignal,
  ReviewScheduleResult,
} from './recommendation-engine.types';

export const RECOMMENDATION_ENGINE_VERSION = 'recommendation-engine-v1';

const DIFFICULTY_RANK: Record<string, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
  EXPERT: 3,
};
const GAP_WEIGHT_SCORE: Record<string, number> = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };
const PRIORITY_WEIGHT: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const REVIEW_INTERVAL_DAYS: Record<string, number> = { CRITICAL: 1, HIGH: 3, MEDIUM: 7, LOW: 14 };
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type SkillBucket = {
  skillId: string;
  tasks: RecommendationTaskSignal[];
  competencyScore: number;
  gap?: RecommendationGapSignal;
};

/**
 * Deterministic, rule-based recommendation/decision engine. No LLM, no
 * embeddings, no external AI service, no randomness: identical
 * RecommendationInput always yields an identical RecommendationComputation.
 */
export class RecommendationEngine {
  evaluate(input: RecommendationInput): RecommendationComputation {
    const buckets = this.groupBySkill(input);
    const daysRemaining = this.daysBetween(input.referenceDate, input.targetDate);
    const priorityWeight = PRIORITY_WEIGHT[input.goalPriority.toUpperCase()] ?? 2;
    const difficultyRank = DIFFICULTY_RANK[input.goalDifficulty.toUpperCase()] ?? 1;

    const items: RecommendationItemResult[] = [];
    const learningStrategies: LearningStrategyResult[] = [];
    const reviewSchedules: ReviewScheduleResult[] = [];

    for (const bucket of buckets) {
      const scores = this.computeScores(
        input,
        bucket,
        daysRemaining,
        priorityWeight,
        difficultyRank,
      );
      const strategy = this.selectStrategy(bucket, scores, input.revisionCount);

      learningStrategies.push({
        skillId: bucket.skillId,
        strategy,
        rationale: this.strategyRationale(strategy, bucket, scores),
      });

      const incompleteCount = bucket.tasks.filter((t) => !t.completed).length;
      if (incompleteCount > 0) {
        items.push(
          this.buildItem(input, 'TASK_PRIORITY', bucket, scores, {
            summary: `${bucket.skillId}: ${incompleteCount} task(s) remaining, priority score ${scores.priorityScore}`,
            evidence: [
              `needScore=${scores.needScore}`,
              `urgencyScore=${scores.urgencyScore}`,
              `riskScore=${scores.riskScore}`,
              `confidenceScore=${scores.confidenceScore}`,
            ],
          }),
        );
      }

      const difficultyItem = this.buildDifficultyAdjustmentItem(input, bucket, scores);
      if (difficultyItem) items.push(difficultyItem);

      if (strategy !== 'SKIP') {
        items.push(
          this.buildItem(
            input,
            'LEARNING_RESOURCE',
            bucket,
            scores,
            {
              summary: `Suggested resources for "${bucket.skillId}" (${strategy})`,
              evidence: [`strategy=${strategy}`, `competencyScore=${bucket.competencyScore}`],
            },
            `skill:${bucket.skillId}:${strategy.toLowerCase()}-resources`,
          ),
        );
      }

      if (bucket.gap) {
        const intervalDays = REVIEW_INTERVAL_DAYS[bucket.gap.weight] ?? 14;
        reviewSchedules.push({
          skillId: bucket.skillId,
          intervalDays,
          dueDate: this.addDays(input.referenceDate, intervalDays),
          reason: `Knowledge gap weight ${bucket.gap.weight} on "${bucket.skillId}"`,
        });

        items.push(
          this.buildItem(input, 'REVIEW_SCHEDULE', bucket, scores, {
            summary: `Schedule a review of "${bucket.skillId}" in ${intervalDays} day(s)`,
            evidence: [`gapWeight=${bucket.gap.weight}`, bucket.gap.reason],
          }),
        );
      }
    }

    const overallUrgency = this.computeUrgencyScore(
      this.totalRemainingWorkDays(input.tasks),
      daysRemaining,
    );
    const criticalGapCount = input.knowledgeGaps.filter((g) => g.weight === 'CRITICAL').length;

    items.push(...this.buildRoadmapAdjustmentItems(input, overallUrgency, criticalGapCount));

    const priorityDecisions = this.buildPriorityDecisions(input, buckets, overallUrgency);

    const overallConfidence =
      items.length === 0
        ? input.confidenceScore
        : Math.round(items.reduce((sum, i) => sum + i.scores.confidenceScore, 0) / items.length);

    return {
      engineVersion: RECOMMENDATION_ENGINE_VERSION,
      items,
      learningStrategies,
      reviewSchedules,
      priorityDecisions,
      overallConfidence,
    };
  }

  private groupBySkill(input: RecommendationInput): SkillBucket[] {
    const bySkill = new Map<string, RecommendationTaskSignal[]>();
    for (const task of input.tasks) {
      const list = bySkill.get(task.skillId) ?? [];
      list.push(task);
      bySkill.set(task.skillId, list);
    }

    const competencyBySkill = new Map<string, RecommendationCompetencySignal>();
    for (const c of input.competencies) competencyBySkill.set(c.skillId, c);

    const gapBySkill = new Map<string, RecommendationGapSignal>();
    for (const g of input.knowledgeGaps) gapBySkill.set(g.skillId, g);

    return [...bySkill.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([skillId, tasks]) => ({
        skillId,
        tasks,
        competencyScore: competencyBySkill.get(skillId)?.score ?? 0,
        gap: gapBySkill.get(skillId),
      }));
  }

  private computeScores(
    input: RecommendationInput,
    bucket: SkillBucket,
    daysRemaining: number,
    priorityWeight: number,
    difficultyRank: number,
  ): RecommendationScoresResult {
    const gapWeightScore = bucket.gap ? (GAP_WEIGHT_SCORE[bucket.gap.weight] ?? 0) : 0;

    const needScoreRaw = gapWeightScore * 0.6 + (100 - bucket.competencyScore) * 0.4;
    const needScore = Math.min(100, Math.round(needScoreRaw * (0.85 + priorityWeight * 0.05)));

    const remainingWorkDays = bucket.tasks
      .filter((t) => !t.completed)
      .reduce((sum, t) => sum + t.estimatedDurationDays, 0);
    const urgencyScore = this.computeUrgencyScore(remainingWorkDays, daysRemaining);

    const difficultyScore = Math.min(
      100,
      Math.round(difficultyRank * 25 + Math.max(0, 50 - bucket.competencyScore) * 0.4),
    );

    const confidenceScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          input.confidenceScore -
            (input.readiness === 'AT_RISK' ? 10 : 0) +
            (bucket.competencyScore >= 80 ? 5 : 0),
        ),
      ),
    );

    const riskScore = Math.min(
      100,
      Math.round(
        input.revisionCount * 3 + gapWeightScore * 0.5 + (input.readiness === 'AT_RISK' ? 20 : 0),
      ),
    );

    const priorityScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          needScore * 0.35 + urgencyScore * 0.25 + riskScore * 0.2 + (100 - confidenceScore) * 0.2,
        ),
      ),
    );

    const overallScore = Math.round(
      (priorityScore + needScore + urgencyScore + riskScore + confidenceScore) / 5,
    );

    return {
      priorityScore,
      needScore,
      urgencyScore,
      difficultyScore,
      confidenceScore,
      riskScore,
      overallScore,
    };
  }

  private computeUrgencyScore(remainingWorkDays: number, daysRemaining: number): number {
    if (remainingWorkDays <= 0) return 0;
    if (daysRemaining <= 0) return 100;
    const pressure = (remainingWorkDays - daysRemaining) / remainingWorkDays;
    return Math.max(0, Math.min(100, Math.round(pressure * 100)));
  }

  private selectStrategy(
    bucket: SkillBucket,
    scores: RecommendationScoresResult,
    revisionCount: number,
  ): LearningStrategyValue {
    const gapWeight = bucket.gap?.weight;
    const overrunRatio = this.averageOverrunRatio(bucket.tasks);
    const hasCompletedOverrun = bucket.tasks.some((t) => t.completed) && overrunRatio >= 0.5;

    if (gapWeight === 'CRITICAL' && bucket.competencyScore < 30) return 'RECOVERY';
    if (gapWeight === 'HIGH' || gapWeight === 'CRITICAL') return 'DEEP_DIVE';
    if (hasCompletedOverrun) return 'REPEAT';
    if (bucket.competencyScore < 50) return 'REVIEW';
    if (bucket.competencyScore < 70) return 'PRACTICE';
    if (revisionCount >= 5 && bucket.competencyScore < 90) return 'SLOW_DOWN';
    if (bucket.competencyScore < 90) return 'ADVANCE';
    return 'SKIP';
  }

  private strategyRationale(
    strategy: LearningStrategyValue,
    bucket: SkillBucket,
    scores: RecommendationScoresResult,
  ): string {
    return `strategy=${strategy} for "${bucket.skillId}" (competency=${bucket.competencyScore}, gap=${bucket.gap?.weight ?? 'none'}, priorityScore=${scores.priorityScore})`;
  }

  private buildDifficultyAdjustmentItem(
    input: RecommendationInput,
    bucket: SkillBucket,
    scores: RecommendationScoresResult,
  ): RecommendationItemResult | null {
    if (scores.difficultyScore - bucket.competencyScore > 30) {
      return this.buildItem(input, 'DIFFICULTY_ADJUSTMENT', bucket, scores, {
        summary: `Decrease difficulty for "${bucket.skillId}" — perceived difficulty exceeds competency`,
        evidence: [
          `difficultyScore=${scores.difficultyScore}`,
          `competencyScore=${bucket.competencyScore}`,
        ],
      });
    }
    if (bucket.competencyScore - scores.difficultyScore > 40 && bucket.competencyScore >= 80) {
      return this.buildItem(input, 'DIFFICULTY_ADJUSTMENT', bucket, scores, {
        summary: `Increase difficulty for "${bucket.skillId}" — competency has outpaced current difficulty`,
        evidence: [
          `difficultyScore=${scores.difficultyScore}`,
          `competencyScore=${bucket.competencyScore}`,
        ],
      });
    }
    return null;
  }

  private buildRoadmapAdjustmentItems(
    input: RecommendationInput,
    overallUrgency: number,
    criticalGapCount: number,
  ): RecommendationItemResult[] {
    const items: RecommendationItemResult[] = [];
    const zeroScores: RecommendationScoresResult = {
      priorityScore: overallUrgency,
      needScore: 0,
      urgencyScore: overallUrgency,
      difficultyScore: 0,
      confidenceScore: input.confidenceScore,
      riskScore: 0,
      overallScore: overallUrgency,
    };
    const pseudoBucket: SkillBucket = { skillId: '__roadmap__', tasks: [], competencyScore: 0 };

    if (input.readiness === 'AT_RISK' && overallUrgency >= 70) {
      items.push(
        this.buildItem(input, 'ROADMAP_ADJUSTMENT', pseudoBucket, zeroScores, {
          summary:
            'Extend target date — readiness is AT_RISK and the remaining workload is tight against the deadline',
          evidence: [`readiness=${input.readiness}`, `overallUrgency=${overallUrgency}`],
        }),
      );
    }

    if (criticalGapCount >= 2) {
      items.push(
        this.buildItem(input, 'ROADMAP_ADJUSTMENT', pseudoBucket, zeroScores, {
          summary: 'Regenerate roadmap recommended — multiple CRITICAL knowledge gaps detected',
          evidence: [`criticalGapCount=${criticalGapCount}`],
        }),
      );
    }

    if (input.revisionCount >= 8) {
      items.push(
        this.buildItem(input, 'ROADMAP_ADJUSTMENT', pseudoBucket, zeroScores, {
          summary:
            'Reduce scope recommended — high roadmap revision churn suggests the current plan is overloaded',
          evidence: [`revisionCount=${input.revisionCount}`],
        }),
      );
    }

    return items;
  }

  private buildPriorityDecisions(
    input: RecommendationInput,
    buckets: SkillBucket[],
    overallUrgency: number,
  ): PriorityDecisionResult[] {
    const needScoreBySkill = new Map<string, number>();
    for (const bucket of buckets) {
      const gapWeightScore = bucket.gap ? (GAP_WEIGHT_SCORE[bucket.gap.weight] ?? 0) : 0;
      needScoreBySkill.set(
        bucket.skillId,
        gapWeightScore * 0.6 + (100 - bucket.competencyScore) * 0.4,
      );
    }

    const completedIds = new Set(input.tasks.filter((t) => t.completed).map((t) => t.id));
    const incompleteTasks = input.tasks.filter((t) => !t.completed);

    const withScores = incompleteTasks.map((task) => {
      const blocked = task.dependsOn.some((depId) => !completedIds.has(depId));
      const needScore = needScoreBySkill.get(task.skillId) ?? 0;
      const riskScore = Math.min(100, input.revisionCount * 3);
      const rawPriority = blocked
        ? 0
        : Math.round(needScore * 0.5 + overallUrgency * 0.3 + riskScore * 0.2);
      return { task, blocked, priorityScore: Math.max(0, Math.min(100, rawPriority)) };
    });

    const sorted = [...withScores].sort((a, b) => {
      if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return a.task.order - b.task.order;
    });

    return sorted.map((entry, index) => ({
      taskId: entry.task.id,
      priorityScore: entry.priorityScore,
      originalOrder: entry.task.order,
      suggestedOrder: index + 1,
      blocked: entry.blocked,
      rationale: entry.blocked
        ? `Blocked: unmet dependency in [${entry.task.dependsOn.join(', ')}]`
        : `priorityScore=${entry.priorityScore} for skill "${entry.task.skillId}"`,
    }));
  }

  private buildItem(
    input: RecommendationInput,
    type: string,
    bucket: SkillBucket,
    scores: RecommendationScoresResult,
    reason: { summary: string; evidence: string[] },
    logicalResourceRef: string | null = null,
  ): RecommendationItemResult {
    return {
      id: `${input.roadmapId}-${type.toLowerCase()}-${bucket.skillId}`,
      type,
      skillId: bucket.skillId === '__roadmap__' ? null : bucket.skillId,
      taskId: null,
      strategy: null,
      priority: Priority.fromScore(scores.priorityScore).getValue(),
      scores,
      reason,
      affectedGoalId: input.goalId,
      affectedRoadmapId: input.roadmapId,
      affectedAssessmentId: input.assessmentId,
      logicalResourceRef,
    };
  }

  private averageOverrunRatio(tasks: RecommendationTaskSignal[]): number {
    const relevant = tasks.filter(
      (t) => t.completed && typeof t.actualDurationDays === 'number' && t.estimatedDurationDays > 0,
    );
    if (relevant.length === 0) return 0;
    const overruns = relevant.map((t) =>
      Math.max(0, (t.actualDurationDays! - t.estimatedDurationDays) / t.estimatedDurationDays),
    );
    return overruns.reduce((sum, v) => sum + v, 0) / overruns.length;
  }

  private totalRemainingWorkDays(tasks: RecommendationTaskSignal[]): number {
    return tasks.filter((t) => !t.completed).reduce((sum, t) => sum + t.estimatedDurationDays, 0);
  }

  private daysBetween(fromIso: string, toIso: string): number {
    const from = new Date(fromIso).getTime();
    const to = new Date(toIso).getTime();
    return Math.round((to - from) / MS_PER_DAY);
  }

  private addDays(fromIso: string, days: number): string {
    const date = new Date(fromIso);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
  }
}
