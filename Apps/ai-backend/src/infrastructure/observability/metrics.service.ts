import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const CIRCUIT_STATE_VALUE: Record<CircuitState, number> = { CLOSED: 0, OPEN: 1, HALF_OPEN: 2 };

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  private readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests processed',
    labelNames: ['method', 'route', 'status'],
    registers: [this.registry],
  });

  private readonly httpRequestDurationSeconds = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  private readonly learningSessionsCreatedTotal = new Counter({
    name: 'learning_sessions_created_total',
    help: 'Total learning sessions created',
    registers: [this.registry],
  });

  private readonly learningSessionsCompletedTotal = new Counter({
    name: 'learning_sessions_completed_total',
    help: 'Total learning sessions completed',
    registers: [this.registry],
  });

  private readonly learningSessionDurationSeconds = new Histogram({
    name: 'learning_session_duration_seconds',
    help: 'Duration of learning sessions in seconds',
    buckets: [60, 300, 600, 1200, 1800, 3600, 7200],
    registers: [this.registry],
  });

  private readonly learningSessionFocusAverage = new Gauge({
    name: 'learning_session_focus_average',
    help: 'Average focus score of learning sessions',
    registers: [this.registry],
  });

  private readonly learningSessionEngagementAverage = new Gauge({
    name: 'learning_session_engagement_average',
    help: 'Average engagement score of learning sessions',
    registers: [this.registry],
  });

  private readonly learningSessionCompletionRate = new Gauge({
    name: 'learning_session_completion_rate',
    help: 'Completion rate of learning session tasks',
    registers: [this.registry],
  });

  private readonly evidenceRecordsTotal = new Counter({
    name: 'evidence_records_total',
    help: 'Total evidence records collected',
    registers: [this.registry],
  });

  private readonly goalCreatedTotal = new Counter({
    name: 'goal_created_total',
    help: 'Total goals created',
    registers: [this.registry],
  });

  private readonly goalCompletedTotal = new Counter({
    name: 'goal_completed_total',
    help: 'Total goals completed',
    registers: [this.registry],
  });

  private readonly roadmapCreatedTotal = new Counter({
    name: 'roadmap_created_total',
    help: 'Total roadmaps created',
    registers: [this.registry],
  });

  private readonly roadmapRegeneratedTotal = new Counter({
    name: 'roadmap_regenerated_total',
    help: 'Total roadmaps regenerated',
    registers: [this.registry],
  });

  private readonly roadmapGenerationDurationSeconds = new Histogram({
    name: 'roadmap_generation_duration',
    help: 'Time spent generating a roadmap plan, in seconds',
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [this.registry],
  });

  private readonly assessmentRunTotal = new Counter({
    name: 'assessment_run_total',
    help: 'Total assessments run',
    registers: [this.registry],
  });

  private readonly assessmentDurationSeconds = new Histogram({
    name: 'assessment_duration',
    help: 'Time spent evaluating an assessment, in seconds',
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [this.registry],
  });

  private readonly knowledgeGapTotal = new Counter({
    name: 'knowledge_gap_total',
    help: 'Total knowledge gaps detected across all assessment runs',
    registers: [this.registry],
  });

  private readonly confidenceAverage = new Gauge({
    name: 'confidence_average',
    help: 'Running average confidence score across all assessment runs',
    registers: [this.registry],
  });

  private confidenceSampleSum = 0;
  private confidenceSampleCount = 0;

  private readonly recommendationGeneratedTotal = new Counter({
    name: 'recommendation_generated_total',
    help: 'Total recommendation sets generated',
    registers: [this.registry],
  });

  private readonly recommendationDurationSeconds = new Histogram({
    name: 'recommendation_duration',
    help: 'Time spent evaluating a recommendation set, in seconds',
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [this.registry],
  });

  private readonly recommendationConfidenceAverage = new Gauge({
    name: 'recommendation_confidence_average',
    help: 'Running average confidence score across all generated recommendations',
    registers: [this.registry],
  });

  private readonly strategyDistributionTotal = new Counter({
    name: 'strategy_distribution_total',
    help: 'Total learning strategy assignments by strategy',
    labelNames: ['strategy'],
    registers: [this.registry],
  });

  private readonly priorityScoreAverage = new Gauge({
    name: 'priority_score_average',
    help: 'Running average priority score across all generated recommendation items',
    registers: [this.registry],
  });

  private recommendationConfidenceSampleSum = 0;
  private recommendationConfidenceSampleCount = 0;
  private priorityScoreSampleSum = 0;
  private priorityScoreSampleCount = 0;

  private readonly missionPlanGeneratedTotal = new Counter({
    name: 'mission_plan_generated_total',
    help: 'Total mission plans generated',
    registers: [this.registry],
  });

  private readonly missionPlanFallbackTotal = new Counter({
    name: 'mission_plan_fallback_total',
    help: 'Total mission plans generated via deterministic fallback',
    registers: [this.registry],
  });

  private readonly missionPlanConfidenceAverage = new Gauge({
    name: 'mission_plan_confidence_average',
    help: 'Running average confidence score across all generated mission plans',
    registers: [this.registry],
  });

  private missionPlanConfidenceSampleSum = 0;
  private missionPlanConfidenceSampleCount = 0;

  private readonly discoveryPlanGeneratedTotal = new Counter({
    name: 'discovery_plan_generated_total',
    help: 'Total discovery plans generated',
    registers: [this.registry],
  });

  private readonly discoveryPlanFallbackTotal = new Counter({
    name: 'discovery_plan_fallback_total',
    help: 'Total discovery plans generated via deterministic fallback',
    registers: [this.registry],
  });

  private readonly discoveryPlanConfidenceAverage = new Gauge({
    name: 'discovery_plan_confidence_average',
    help: 'Running average confidence score across all generated discovery plans',
    registers: [this.registry],
  });

  private discoveryPlanConfidenceSampleSum = 0;
  private discoveryPlanConfidenceSampleCount = 0;

  private readonly mongodbLatencyMs = new Histogram({
    name: 'mongodb_latency_ms',
    help: 'MongoDB operation latency in milliseconds',
    labelNames: ['operation'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
    registers: [this.registry],
  });

  private readonly redisLatencyMs = new Histogram({
    name: 'redis_latency_ms',
    help: 'Redis operation latency in milliseconds',
    labelNames: ['operation'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500],
    registers: [this.registry],
  });

  private readonly bullmqJobsTotal = new Counter({
    name: 'bullmq_jobs_total',
    help: 'Total BullMQ jobs by outcome',
    labelNames: ['status'],
    registers: [this.registry],
  });

  private readonly bullmqQueueDelayMs = new Histogram({
    name: 'bullmq_queue_delay_ms',
    help: 'Time a BullMQ job waited in queue before processing began, in milliseconds',
    buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
    registers: [this.registry],
  });

  private readonly outboxPendingTotal = new Gauge({
    name: 'outbox_pending_total',
    help: 'Number of PENDING rows in the outbox at last relay sweep',
    registers: [this.registry],
  });

  private readonly circuitBreakerState = new Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker state per job key (0=CLOSED, 1=OPEN, 2=HALF_OPEN)',
    labelNames: ['job'],
    registers: [this.registry],
  });

  private readonly serviceDependencyUp = new Gauge({
    name: 'service_dependency_up',
    help: 'Whether a dependency is reachable (1) or not (0)',
    labelNames: ['dependency'],
    registers: [this.registry],
  });

  recordHttpRequest(method: string, route: string, status: number, durationSeconds: number): void {
    const labels = { method, route, status: String(status) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationSeconds);
  }

  incrementLearningSessionsCreated(): void {
    this.learningSessionsCreatedTotal.inc();
  }

  incrementLearningSessionsCompleted(): void {
    this.learningSessionsCompletedTotal.inc();
  }

  recordLearningSessionDuration(durationSeconds: number): void {
    this.learningSessionDurationSeconds.observe(durationSeconds);
  }

  recordLearningSessionFocus(score: number): void {
    this.learningSessionFocusAverage.set(score);
  }

  recordLearningSessionEngagement(score: number): void {
    this.learningSessionEngagementAverage.set(score);
  }

  recordLearningSessionCompletionRate(rate: number): void {
    this.learningSessionCompletionRate.set(rate);
  }

  incrementEvidenceRecords(count = 1): void {
    this.evidenceRecordsTotal.inc(count);
  }

  incrementGoalCreated(): void {
    this.goalCreatedTotal.inc();
  }

  incrementGoalCompleted(): void {
    this.goalCompletedTotal.inc();
  }

  incrementRoadmapCreated(): void {
    this.roadmapCreatedTotal.inc();
  }

  incrementRoadmapRegenerated(): void {
    this.roadmapRegeneratedTotal.inc();
  }

  recordRoadmapGenerationDuration(durationSeconds: number): void {
    this.roadmapGenerationDurationSeconds.observe(durationSeconds);
  }

  incrementAssessmentRun(): void {
    this.assessmentRunTotal.inc();
  }

  recordAssessmentDuration(durationSeconds: number): void {
    this.assessmentDurationSeconds.observe(durationSeconds);
  }

  incrementKnowledgeGap(count = 1): void {
    this.knowledgeGapTotal.inc(count);
  }

  recordConfidenceScore(score: number): void {
    this.confidenceSampleSum += score;
    this.confidenceSampleCount += 1;
    this.confidenceAverage.set(this.confidenceSampleSum / this.confidenceSampleCount);
  }

  incrementRecommendationGenerated(): void {
    this.recommendationGeneratedTotal.inc();
  }

  recordRecommendationDuration(durationSeconds: number): void {
    this.recommendationDurationSeconds.observe(durationSeconds);
  }

  recordRecommendationConfidence(score: number): void {
    this.recommendationConfidenceSampleSum += score;
    this.recommendationConfidenceSampleCount += 1;
    this.recommendationConfidenceAverage.set(
      this.recommendationConfidenceSampleSum / this.recommendationConfidenceSampleCount,
    );
  }

  incrementStrategyDistribution(strategy: string): void {
    this.strategyDistributionTotal.inc({ strategy });
  }

  recordPriorityScore(score: number): void {
    this.priorityScoreSampleSum += score;
    this.priorityScoreSampleCount += 1;
    this.priorityScoreAverage.set(this.priorityScoreSampleSum / this.priorityScoreSampleCount);
  }

  incrementMissionPlanGenerated(): void {
    this.missionPlanGeneratedTotal.inc();
  }

  incrementMissionPlanFallbackUsed(): void {
    this.missionPlanFallbackTotal.inc();
  }

  recordMissionPlanConfidence(score: number): void {
    this.missionPlanConfidenceSampleSum += score;
    this.missionPlanConfidenceSampleCount += 1;
    this.missionPlanConfidenceAverage.set(
      this.missionPlanConfidenceSampleSum / this.missionPlanConfidenceSampleCount,
    );
  }

  incrementDiscoveryPlanGenerated(): void {
    this.discoveryPlanGeneratedTotal.inc();
  }

  incrementDiscoveryPlanFallbackUsed(): void {
    this.discoveryPlanFallbackTotal.inc();
  }

  recordDiscoveryPlanConfidence(score: number): void {
    this.discoveryPlanConfidenceSampleSum += score;
    this.discoveryPlanConfidenceSampleCount += 1;
    this.discoveryPlanConfidenceAverage.set(
      this.discoveryPlanConfidenceSampleSum / this.discoveryPlanConfidenceSampleCount,
    );
  }

  recordMongoLatency(operation: string, latencyMs: number): void {
    this.mongodbLatencyMs.observe({ operation }, latencyMs);
  }

  recordRedisLatency(operation: string, latencyMs: number): void {
    this.redisLatencyMs.observe({ operation }, latencyMs);
  }

  incrementBullmqJob(status: 'enqueued' | 'processed' | 'failed' | 'dead_lettered'): void {
    this.bullmqJobsTotal.inc({ status });
  }

  recordBullmqQueueDelay(delayMs: number): void {
    this.bullmqQueueDelayMs.observe(delayMs);
  }

  setOutboxPending(count: number): void {
    this.outboxPendingTotal.set(count);
  }

  setCircuitBreakerState(job: string, state: CircuitState): void {
    this.circuitBreakerState.set({ job }, CIRCUIT_STATE_VALUE[state]);
  }

  setDependencyUp(dependency: string, up: boolean): void {
    this.serviceDependencyUp.set({ dependency }, up ? 1 : 0);
  }

  async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
