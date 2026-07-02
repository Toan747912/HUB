import { CompetencyLevel } from '../../../../shared/domain/vocabulary/competency-level.vo';
import { KnowledgeWeight } from '../value-objects/knowledge-weight.vo';
import {
  AssessmentComputation,
  AssessmentInput,
  CompetencyResult,
  KnowledgeGapResult,
  ReadinessLevel,
  SkillScoreResult
} from './assessment-engine.types';

export const ASSESSMENT_ENGINE_VERSION = 'assessment-engine-v1';

const GAP_THRESHOLD = 50;
const WEAK_THRESHOLD = 50;
const STRONG_THRESHOLD = 80;
const READY_COMPLETION_THRESHOLD = 80;
const READY_CONFIDENCE_THRESHOLD = 60;
const AT_RISK_CONFIDENCE_THRESHOLD = 40;
const LATENCY_PENALTY_CAP = 25;
const REVISION_PENALTY_PER_UNIT = 2;
const REVISION_PENALTY_CAP = 20;
const STABILITY_SAMPLE_SIZE = 3;
const STABILITY_BONUS = 5;
const STABILITY_PENALTY = 5;
const STABLE_STDEV_THRESHOLD = 5;
const VOLATILE_STDEV_THRESHOLD = 15;

/**
 * Deterministic, rule-based assessment engine. No LLM, no embeddings, no
 * randomness: identical AssessmentInput always yields an identical
 * AssessmentComputation.
 */
export class AssessmentEngine {
  evaluate(input: AssessmentInput): AssessmentComputation {
    const skillScores = this.computeSkillScores(input.tasks);
    const competencies = this.computeCompetencies(skillScores);
    const knowledgeGaps = this.detectKnowledgeGaps(input, skillScores);

    const weakAreas = competencies
      .filter((c) => c.score < WEAK_THRESHOLD)
      .sort((a, b) => a.score - b.score)
      .map((c) => c.skillId);

    const strongAreas = competencies
      .filter((c) => c.score >= STRONG_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .map((c) => c.skillId);

    const confidenceScore = this.estimateConfidence(input, competencies, knowledgeGaps);
    const readiness = this.calculateReadiness(input, confidenceScore, knowledgeGaps);

    return {
      engineVersion: ASSESSMENT_ENGINE_VERSION,
      skillScores,
      competencies,
      knowledgeGaps,
      confidenceScore,
      readiness,
      weakAreas,
      strongAreas
    };
  }

  private computeSkillScores(tasks: AssessmentInput['tasks']): SkillScoreResult[] {
    const bySkill = new Map<string, { total: number; completed: number }>();

    for (const task of tasks) {
      const bucket = bySkill.get(task.skillId) ?? { total: 0, completed: 0 };
      bucket.total += 1;
      if (task.completed) bucket.completed += 1;
      bySkill.set(task.skillId, bucket);
    }

    return [...bySkill.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([skillId, bucket]) => ({
        skillId,
        rawScore: bucket.total === 0 ? 0 : Math.round((bucket.completed / bucket.total) * 100),
        taskCount: bucket.total,
        completedTaskCount: bucket.completed
      }));
  }

  private computeCompetencies(skillScores: SkillScoreResult[]): CompetencyResult[] {
    return skillScores.map((skill) => ({
      skillId: skill.skillId,
      score: skill.rawScore,
      level: CompetencyLevel.fromScore(skill.rawScore).getValue()
    }));
  }

  private detectKnowledgeGaps(input: AssessmentInput, skillScores: SkillScoreResult[]): KnowledgeGapResult[] {
    return skillScores
      .filter((skill) => skill.rawScore < GAP_THRESHOLD)
      .map((skill) => {
        const overrunSeverity = this.averageOverrunRatio(input.tasks, skill.skillId) * 100;
        const severity = GAP_THRESHOLD - skill.rawScore + overrunSeverity;
        return {
          id: `${input.roadmapId}-gap-${skill.skillId}`,
          skillId: skill.skillId,
          weight: KnowledgeWeight.fromSeverity(severity).getValue(),
          reason: `Completion for "${skill.skillId}" is ${skill.rawScore}%, below the ${GAP_THRESHOLD}% readiness threshold`
        };
      });
  }

  private estimateConfidence(
    input: AssessmentInput,
    competencies: CompetencyResult[],
    knowledgeGaps: KnowledgeGapResult[]
  ): number {
    const averageCompetencyScore =
      competencies.length === 0 ? 0 : competencies.reduce((sum, c) => sum + c.score, 0) / competencies.length;

    const base = input.roadmapCompletionRatio * 0.6 + averageCompetencyScore * 0.4;
    const latencyPenalty = Math.min(this.averageOverrunRatio(input.tasks) * LATENCY_PENALTY_CAP, LATENCY_PENALTY_CAP);
    const revisionPenalty = Math.min(input.revisionCount * REVISION_PENALTY_PER_UNIT, REVISION_PENALTY_CAP);
    const stabilityAdjustment = this.computeStabilityAdjustment(input.previousRuns);

    const raw = base - latencyPenalty - revisionPenalty + stabilityAdjustment;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  private calculateReadiness(
    input: AssessmentInput,
    confidenceScore: number,
    knowledgeGaps: KnowledgeGapResult[]
  ): ReadinessLevel {
    const hasCriticalGap = knowledgeGaps.some((gap) => gap.weight === 'CRITICAL');

    if (input.roadmapCompletionRatio >= READY_COMPLETION_THRESHOLD && !hasCriticalGap && confidenceScore >= READY_CONFIDENCE_THRESHOLD) {
      return 'READY';
    }

    if (hasCriticalGap || confidenceScore < AT_RISK_CONFIDENCE_THRESHOLD) {
      return 'AT_RISK';
    }

    return 'NOT_READY';
  }

  private averageOverrunRatio(tasks: AssessmentInput['tasks'], skillId?: string): number {
    const relevant = tasks.filter(
      (task) => (skillId === undefined || task.skillId === skillId) && task.completed && typeof task.actualDurationDays === 'number' && task.estimatedDurationDays > 0
    );
    if (relevant.length === 0) return 0;

    const overruns = relevant.map((task) => Math.max(0, (task.actualDurationDays! - task.estimatedDurationDays) / task.estimatedDurationDays));
    return overruns.reduce((sum, v) => sum + v, 0) / overruns.length;
  }

  private computeStabilityAdjustment(previousRuns: AssessmentInput['previousRuns']): number {
    if (previousRuns.length < 2) return 0;

    const sample = previousRuns.slice(-STABILITY_SAMPLE_SIZE).map((run) => run.confidenceScore);
    const mean = sample.reduce((sum, v) => sum + v, 0) / sample.length;
    const variance = sample.reduce((sum, v) => sum + (v - mean) ** 2, 0) / sample.length;
    const stdev = Math.sqrt(variance);

    if (stdev <= STABLE_STDEV_THRESHOLD) return STABILITY_BONUS;
    if (stdev >= VOLATILE_STDEV_THRESHOLD) return -STABILITY_PENALTY;
    return 0;
  }
}
