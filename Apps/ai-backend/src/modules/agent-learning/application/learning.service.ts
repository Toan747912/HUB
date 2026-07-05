import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Counter, Histogram } from 'prom-client';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { CompletedExecutionInput } from '../domain/experience';
import { LearningErrorCode, LearningExecutionError } from '../domain/learning.types';
import { LearningRecord } from '../domain/learning-record';
import { ILearningRepository, LEARNING_REPOSITORY } from '../interfaces/learning.interface';
import { ExperienceExtractorService } from './experience-extractor.service';
import { FeedbackService } from './feedback.service';
import { KnowledgeBuilderService } from './knowledge-builder.service';
import { PatternDetectorService } from './pattern-detector.service';
import { RecommendationEngineService } from './recommendation-engine.service';

type LearningEvent =
  | 'LEARNING_STARTED'
  | 'EXPERIENCE_CAPTURED'
  | 'PATTERN_DETECTED'
  | 'KNOWLEDGE_CREATED'
  | 'RECOMMENDATION_GENERATED'
  | 'LEARNING_COMPLETED'
  | 'LEARNING_FAILED';

const DEFAULT_HISTORY_LIMIT = 50;

/**
 * Orchestrates the whole Adaptive Learning Engine pipeline:
 * ExperienceExtractor -> PatternDetector -> KnowledgeBuilder ->
 * RecommendationEngine -> FeedbackService, then persists one additive
 * LearningRecord per cycle. Never mutates the source execution data it
 * reads, never reaches back into the runtime to apply anything it learns —
 * this is the single read/write boundary for the agent-learning module.
 *
 * Metric names (learning_total, experience_total, pattern_total,
 * knowledge_total, recommendation_total, learning_duration_ms) are new to
 * this module, so rather than editing the shared MetricsService (out of
 * scope for WP-AI-03J) they are registered onto that same service's public
 * Prometheus registry — the metrics show up on the existing /metrics
 * endpoint without touching infrastructure/observability/metrics.service.ts.
 */
@Injectable()
export class LearningService {
  private readonly learningTotal: Counter<string>;
  private readonly experienceTotal: Counter<string>;
  private readonly patternTotal: Counter<string>;
  private readonly knowledgeTotal: Counter<string>;
  private readonly recommendationTotal: Counter<string>;
  private readonly learningDurationMs: Histogram<string>;

  constructor(
    @Inject(LEARNING_REPOSITORY) private readonly repository: ILearningRepository,
    private readonly extractor: ExperienceExtractorService,
    private readonly patternDetector: PatternDetectorService,
    private readonly knowledgeBuilder: KnowledgeBuilderService,
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly feedback: FeedbackService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService,
  ) {
    const registers = this.metrics ? [this.metrics.registry] : [];
    this.learningTotal = new Counter({
      name: 'learning_total',
      help: 'Total adaptive learning cycles run, labeled by outcome status',
      labelNames: ['status'],
      registers,
    });
    this.experienceTotal = new Counter({
      name: 'experience_total',
      help: 'Total Experiences extracted from completed executions',
      registers,
    });
    this.patternTotal = new Counter({
      name: 'pattern_total',
      help: 'Total ExecutionPatterns detected, labeled by category',
      labelNames: ['category'],
      registers,
    });
    this.knowledgeTotal = new Counter({
      name: 'knowledge_total',
      help: 'Total KnowledgeItems created, labeled by type',
      labelNames: ['type'],
      registers,
    });
    this.recommendationTotal = new Counter({
      name: 'recommendation_total',
      help: 'Total Recommendations generated, labeled by category',
      labelNames: ['category'],
      registers,
    });
    this.learningDurationMs = new Histogram({
      name: 'learning_duration_ms',
      help: 'Duration of one adaptive learning cycle in milliseconds',
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      registers,
    });
  }

  /**
   * Runs one full learning cycle for a single completed execution and
   * persists the resulting LearningRecord. `historyLimit` bounds how many
   * past LearningRecords are pulled in so PatternDetectorService can look
   * for cross-run trends, not just within this one execution.
   */
  async runCycle(input: CompletedExecutionInput, historyLimit = DEFAULT_HISTORY_LIMIT): Promise<LearningRecord> {
    const startedAt = Date.now();
    const recordId = randomUUID();
    this.emit('LEARNING_STARTED', recordId, 'SUCCESS', 0);

    try {
      const experience = this.extractor.extract(input);
      this.experienceTotal.inc();
      this.emit('EXPERIENCE_CAPTURED', experience.experienceId, 'SUCCESS', Date.now() - startedAt);

      const history = await this.repository.listRecentLearningRecords(historyLimit);
      const historicalExperiences = history.map((record) => record.experience);
      const patterns = this.patternDetector.detect([...historicalExperiences, experience]);
      for (const pattern of patterns) {
        this.patternTotal.inc({ category: pattern.category });
      }
      this.emit('PATTERN_DETECTED', experience.experienceId, 'SUCCESS', Date.now() - startedAt, {
        count: patterns.length,
      });

      const knowledgeItems = this.knowledgeBuilder.build(patterns);
      for (const item of knowledgeItems) {
        this.knowledgeTotal.inc({ type: item.type });
      }
      this.emit('KNOWLEDGE_CREATED', experience.experienceId, 'SUCCESS', Date.now() - startedAt, {
        count: knowledgeItems.length,
      });

      const recommendations = this.recommendationEngine.generate(knowledgeItems);
      for (const recommendation of recommendations) {
        this.recommendationTotal.inc({ category: recommendation.category });
      }
      this.emit('RECOMMENDATION_GENERATED', experience.experienceId, 'SUCCESS', Date.now() - startedAt, {
        count: recommendations.length,
      });

      const feedbackEvent = this.feedback.buildFeedbackEvent(
        recordId,
        experience,
        patterns,
        knowledgeItems,
        recommendations,
      );

      const record: LearningRecord = {
        recordId,
        experience,
        patternIds: patterns.map((p) => p.patternId),
        knowledgeItemIds: knowledgeItems.map((k) => k.id),
        recommendationIds: recommendations.map((r) => r.id),
        feedback: feedbackEvent,
        createdAt: startedAt,
      };

      // All four writes for one learning cycle succeed or fail together -
      // a crash mid-cycle must never leave orphaned patterns/knowledge/
      // recommendations with no owning LearningRecord. The repository owns
      // the transaction (it already owns every Mongoose model involved).
      const saved = await this.repository.persistLearningCycle(patterns, knowledgeItems, recommendations, record);

      const durationMs = Date.now() - startedAt;
      this.learningTotal.inc({ status: 'SUCCESS' });
      this.learningDurationMs.observe(durationMs);
      this.emit('LEARNING_COMPLETED', experience.experienceId, 'SUCCESS', durationMs, {
        patternCount: patterns.length,
        knowledgeCount: knowledgeItems.length,
        recommendationCount: recommendations.length,
      });

      return saved;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : String(error);
      this.learningTotal.inc({ status: 'FAILURE' });
      this.emit('LEARNING_FAILED', recordId, 'FAILURE', durationMs, undefined, message);
      if (error instanceof LearningExecutionError) throw error;
      throw new LearningExecutionError(LearningErrorCode.CYCLE_FAILED, message, error);
    }
  }

  private emit(
    operation: LearningEvent,
    aggregateId: string,
    status: 'SUCCESS' | 'FAILURE',
    latencyMs: number,
    after?: Record<string, unknown>,
    errorCode?: string,
  ): void {
    this.structuredLogger?.log({
      operation,
      status,
      latencyMs,
      aggregateId,
      errorCode,
    });
    void this.auditLog
      ?.recordSecurityEvent({
        traceId: randomUUID(),
        userId: null,
        operation,
        resource: `LearningRecord:${aggregateId}`,
        after: errorCode ? { error: errorCode } : after,
      })
      .catch(() => undefined);
  }
}
