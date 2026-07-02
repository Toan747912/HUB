import { DatabaseHealthService } from '../../../health/database-health.service';
import { RedisHealthService } from '../../../health/redis-health.service';
import { QueueService } from '../../jobs/queue.service';
import { MetricsController } from '../metrics.controller';
import { MetricsService } from '../metrics.service';

describe('MetricsController', () => {
  let metrics: MetricsService;
  let dbHealth: jest.Mocked<Pick<DatabaseHealthService, 'isReady'>>;
  let redisHealth: jest.Mocked<Pick<RedisHealthService, 'isReady' | 'getStatus'>>;
  let queue: jest.Mocked<Pick<QueueService, 'isReady'>>;
  let controller: MetricsController;

  beforeEach(() => {
    metrics = new MetricsService();
    dbHealth = { isReady: jest.fn().mockReturnValue(true) };
    redisHealth = { isReady: jest.fn().mockReturnValue(false), getStatus: jest.fn().mockReturnValue('not_configured') };
    queue = { isReady: jest.fn().mockReturnValue(false) };

    controller = new MetricsController(
      metrics,
      dbHealth as unknown as DatabaseHealthService,
      redisHealth as unknown as RedisHealthService,
      queue as unknown as QueueService
    );
  });

  // Evidence: Metrics endpoint
  it('returns Prometheus text with dependency gauges refreshed from live health services', async () => {
    const text = await controller.getMetrics();

    expect(text).toMatch(/service_dependency_up\{dependency="mongodb"\} 1/);
    expect(text).toMatch(/service_dependency_up\{dependency="redis"\} 0/);
    // bullmq is considered "up" when redis isn't configured at all (dev/no-op mode)
    expect(text).toMatch(/service_dependency_up\{dependency="bullmq"\} 1/);
  });

  it('reflects bullmq down when redis is configured but the queue is not ready', async () => {
    redisHealth.getStatus.mockReturnValue('disconnected');
    queue.isReady.mockReturnValue(false);

    const text = await controller.getMetrics();
    expect(text).toMatch(/service_dependency_up\{dependency="bullmq"\} 0/);
  });
});
