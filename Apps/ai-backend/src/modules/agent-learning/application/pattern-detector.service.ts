import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ExecutionPattern, PatternCategory } from '../domain/execution-pattern';
import { Experience } from '../domain/experience';

const MIN_SAMPLES = 2;
const MESSAGE_BOTTLENECK_THRESHOLD = 6;
const SUCCESS_PATTERN_THRESHOLD = 0.8;
const FAILURE_PATTERN_THRESHOLD = 0.5;
const CONSENSUS_QUALITY_THRESHOLD = 0.6;
const CONFIDENCE_TREND_THRESHOLD = 0.1;

/**
 * Step 2 of the learning pipeline: mines ExecutionPatterns out of a set of
 * Experiences (the newly captured one plus whatever history the caller
 * passes in). Every detector below is a simple, explainable heuristic over
 * the Experience fields — no ML, so every pattern's confidence traces back
 * to a concrete count/ratio in its evidence.
 */
@Injectable()
export class PatternDetectorService {
  detect(experiences: Experience[]): ExecutionPattern[] {
    if (experiences.length === 0) return [];

    return [
      ...this.detectSuccessfulWorkflows(experiences),
      ...this.detectFrequentFailures(experiences),
      ...this.detectToolUsageTrends(experiences),
      ...this.detectPlannerConfidenceTrends(experiences),
      ...this.detectConsensusQuality(experiences),
      ...this.detectArtifactReuse(experiences),
      ...this.detectRoleEffectiveness(experiences),
      ...this.detectMessageBottlenecks(experiences),
    ];
  }

  private detectSuccessfulWorkflows(experiences: Experience[]): ExecutionPattern[] {
    const byWorkflow = this.groupBy(experiences, (e) => e.workflowId);
    const patterns: ExecutionPattern[] = [];
    for (const [workflowId, group] of byWorkflow) {
      if (group.length < MIN_SAMPLES) continue;
      const successRate = group.filter((e) => e.success).length / group.length;
      if (successRate < SUCCESS_PATTERN_THRESHOLD) continue;
      patterns.push(
        this.buildPattern(
          'successful_workflow',
          workflowId,
          `Workflow "${workflowId}" completes successfully ${Math.round(successRate * 100)}% of the time across ${group.length} runs.`,
          successRate,
          group,
          { successRate },
        ),
      );
    }
    return patterns;
  }

  private detectFrequentFailures(experiences: Experience[]): ExecutionPattern[] {
    const byWorkflow = this.groupBy(experiences, (e) => e.workflowId);
    const patterns: ExecutionPattern[] = [];
    for (const [workflowId, group] of byWorkflow) {
      if (group.length < MIN_SAMPLES) continue;
      const failureRate = group.filter((e) => !e.success).length / group.length;
      if (failureRate < FAILURE_PATTERN_THRESHOLD) continue;
      patterns.push(
        this.buildPattern(
          'frequent_failure',
          workflowId,
          `Workflow "${workflowId}" fails ${Math.round(failureRate * 100)}% of the time across ${group.length} runs.`,
          failureRate,
          group,
          { failureRate },
        ),
      );
    }
    return patterns;
  }

  private detectToolUsageTrends(experiences: Experience[]): ExecutionPattern[] {
    const byType = new Map<string, Experience[]>();
    for (const experience of experiences) {
      for (const artifact of experience.artifacts) {
        const list = byType.get(artifact.type) ?? [];
        list.push(experience);
        byType.set(artifact.type, list);
      }
    }
    const patterns: ExecutionPattern[] = [];
    for (const [type, group] of byType) {
      if (group.length < MIN_SAMPLES) continue;
      const confidence = Math.min(1, group.length / (experiences.length * 2));
      patterns.push(
        this.buildPattern(
          'tool_usage_trend',
          type,
          `Artifact/tool type "${type}" was produced ${group.length} times across recent executions.`,
          confidence,
          group,
          { occurrences: group.length },
        ),
      );
    }
    return patterns;
  }

  private detectPlannerConfidenceTrends(experiences: Experience[]): ExecutionPattern[] {
    const byCapability = this.groupBy(
      experiences.filter((e) => e.plannerCapability),
      (e) => e.plannerCapability as string,
    );
    const patterns: ExecutionPattern[] = [];
    for (const [capability, group] of byCapability) {
      if (group.length < MIN_SAMPLES) continue;
      const sorted = [...group].sort((a, b) => a.capturedAt - b.capturedAt);
      const trend = sorted[sorted.length - 1].confidence - sorted[0].confidence;
      if (Math.abs(trend) < CONFIDENCE_TREND_THRESHOLD) continue;
      const direction = trend > 0 ? 'increasing' : 'decreasing';
      patterns.push(
        this.buildPattern(
          'planner_confidence_trend',
          capability,
          `Planner "${capability}" confidence is ${direction} (${trend.toFixed(2)} delta across ${group.length} runs).`,
          Math.min(1, Math.abs(trend)),
          group,
          { trend },
        ),
      );
    }
    return patterns;
  }

  private detectConsensusQuality(experiences: Experience[]): ExecutionPattern[] {
    const byStrategy = this.groupBy(
      experiences.filter((e) => e.consensus?.strategy),
      (e) => e.consensus?.strategy as string,
    );
    const patterns: ExecutionPattern[] = [];
    for (const [strategy, group] of byStrategy) {
      const scored = group.filter((e) => typeof e.consensus?.agreementScore === 'number');
      if (scored.length === 0) continue;
      const avgScore =
        scored.reduce((sum, e) => sum + (e.consensus?.agreementScore ?? 0), 0) / scored.length;
      const quality = avgScore >= CONSENSUS_QUALITY_THRESHOLD ? 'high' : 'low';
      patterns.push(
        this.buildPattern(
          'consensus_quality',
          strategy,
          `Consensus strategy "${strategy}" yields ${quality} agreement (avg score ${avgScore.toFixed(2)} across ${scored.length} sessions).`,
          avgScore,
          scored,
          { averageAgreementScore: avgScore },
        ),
      );
    }
    return patterns;
  }

  private detectArtifactReuse(experiences: Experience[]): ExecutionPattern[] {
    const byType = new Map<string, Set<string>>();
    const experienceByType = new Map<string, Experience[]>();
    for (const experience of experiences) {
      for (const artifact of experience.artifacts) {
        const ids = byType.get(artifact.type) ?? new Set<string>();
        ids.add(experience.experienceId);
        byType.set(artifact.type, ids);
        const list = experienceByType.get(artifact.type) ?? [];
        list.push(experience);
        experienceByType.set(artifact.type, list);
      }
    }
    const patterns: ExecutionPattern[] = [];
    for (const [type, ids] of byType) {
      if (ids.size < MIN_SAMPLES) continue;
      const confidence = Math.min(1, ids.size / experiences.length);
      patterns.push(
        this.buildPattern(
          'artifact_reuse',
          type,
          `Artifact type "${type}" is reused across ${ids.size} distinct executions.`,
          confidence,
          experienceByType.get(type) ?? [],
          { distinctExecutions: ids.size },
        ),
      );
    }
    return patterns;
  }

  private detectRoleEffectiveness(experiences: Experience[]): ExecutionPattern[] {
    const byRole = new Map<string, Experience[]>();
    for (const experience of experiences) {
      for (const role of Object.keys(experience.roles)) {
        const list = byRole.get(role) ?? [];
        list.push(experience);
        byRole.set(role, list);
      }
    }
    const patterns: ExecutionPattern[] = [];
    for (const [role, group] of byRole) {
      if (group.length < MIN_SAMPLES) continue;
      const successRate = group.filter((e) => e.success).length / group.length;
      patterns.push(
        this.buildPattern(
          'role_effectiveness',
          role,
          `Role "${role}" participates in successful outcomes ${Math.round(successRate * 100)}% of the time across ${group.length} runs.`,
          successRate,
          group,
          { successRate },
        ),
      );
    }
    return patterns;
  }

  private detectMessageBottlenecks(experiences: Experience[]): ExecutionPattern[] {
    const byWorkflow = this.groupBy(experiences, (e) => e.workflowId);
    const patterns: ExecutionPattern[] = [];
    for (const [workflowId, group] of byWorkflow) {
      const flagged = group.filter((e) => e.messages.length >= MESSAGE_BOTTLENECK_THRESHOLD);
      if (flagged.length === 0) continue;
      const avgMessages = flagged.reduce((sum, e) => sum + e.messages.length, 0) / flagged.length;
      patterns.push(
        this.buildPattern(
          'message_bottleneck',
          workflowId,
          `Workflow "${workflowId}" exchanges an unusually high number of messages (avg ${avgMessages.toFixed(1)}) in ${flagged.length} run(s), suggesting a coordination bottleneck.`,
          Math.min(1, avgMessages / (MESSAGE_BOTTLENECK_THRESHOLD * 2)),
          flagged,
          { averageMessageCount: avgMessages },
        ),
      );
    }
    return patterns;
  }

  private buildPattern(
    category: PatternCategory,
    subject: string,
    description: string,
    confidence: number,
    supportingExperiences: Experience[],
    metrics: Record<string, number>,
  ): ExecutionPattern {
    return {
      patternId: randomUUID(),
      category,
      subject,
      description,
      confidence: Math.min(1, Math.max(0, confidence)),
      evidence: {
        experienceIds: supportingExperiences.map((e) => e.experienceId),
        occurrences: supportingExperiences.length,
        metrics,
      },
      detectedAt: Date.now(),
    };
  }

  private groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();
    for (const item of items) {
      const key = keyFn(item);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }
}
