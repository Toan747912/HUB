import { Controller, Get, Header } from '@nestjs/common';
import { DatabaseHealthService } from '../../health/database-health.service';
import { RedisHealthService } from '../../health/redis-health.service';
import { Public } from '../security/rbac/public.decorator';
import { QueueService } from '../jobs/queue.service';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly dbHealth: DatabaseHealthService,
    private readonly redisHealth: RedisHealthService,
    private readonly queue: QueueService,
  ) {}

  @Public()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    this.metrics.setDependencyUp('mongodb', this.dbHealth.isReady());
    this.metrics.setDependencyUp('redis', this.redisHealth.isReady());
    this.metrics.setDependencyUp(
      'bullmq',
      this.redisHealth.getStatus() === 'not_configured' || this.queue.isReady(),
    );

    return this.metrics.getMetricsText();
  }
}
