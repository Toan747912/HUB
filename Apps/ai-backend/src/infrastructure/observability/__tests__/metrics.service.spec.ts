import { MetricsService } from '../metrics.service';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  // Evidence: Metrics endpoint contains all required metric names
  it('exposes all required metric names in getMetricsText()', async () => {
    metrics.recordHttpRequest('GET', '/goal', 200, 0.05);
    metrics.incrementGoalCreated();
    metrics.incrementGoalCompleted();
    metrics.recordDbLatency('save', 12);
    metrics.recordRedisLatency('ping', 3);
    metrics.incrementBullmqJob('enqueued');
    metrics.setOutboxPending(2);
    metrics.setCircuitBreakerState('GoalCreated', 'CLOSED');

    const text = await metrics.getMetricsText();

    for (const name of [
      'http_requests_total',
      'http_request_duration_seconds',
      'goal_created_total',
      'goal_completed_total',
      'db_latency_ms',
      'redis_latency_ms',
      'bullmq_jobs_total',
      'outbox_pending_total',
      'circuit_breaker_state',
    ]) {
      expect(text).toContain(name);
    }
  });

  it('records goal_created_total and goal_completed_total increments correctly', async () => {
    metrics.incrementGoalCreated();
    metrics.incrementGoalCreated();
    metrics.incrementGoalCompleted();

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/goal_created_total 2/);
    expect(text).toMatch(/goal_completed_total 1/);
  });

  it('maps circuit breaker states to the documented numeric values', async () => {
    metrics.setCircuitBreakerState('job-a', 'CLOSED');
    metrics.setCircuitBreakerState('job-b', 'OPEN');
    metrics.setCircuitBreakerState('job-c', 'HALF_OPEN');

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/circuit_breaker_state\{job="job-a"\} 0/);
    expect(text).toMatch(/circuit_breaker_state\{job="job-b"\} 1/);
    expect(text).toMatch(/circuit_breaker_state\{job="job-c"\} 2/);
  });

  it('sets service_dependency_up gauges', async () => {
    metrics.setDependencyUp('redis', true);
    metrics.setDependencyUp('postgresql', false);

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/service_dependency_up\{dependency="redis"\} 1/);
    expect(text).toMatch(/service_dependency_up\{dependency="postgresql"\} 0/);
  });

  it('each MetricsService instance has an isolated registry (no cross-instance leakage)', async () => {
    const other = new MetricsService();
    metrics.incrementGoalCreated();

    const otherText = await other.getMetricsText();
    expect(otherText).toMatch(/goal_created_total 0/);
  });
});
