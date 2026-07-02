import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { QueueService } from '../infrastructure/jobs/queue.service';
import { DatabaseHealthService } from './database-health.service';
import { RedisHealthService } from './redis-health.service';

type HealthResponse = {
  status: 'ok' | 'degraded' | 'unavailable';
  timestamp: string;
  uptime: number;
  checks?: Record<string, string>;
};

@Controller()
export class HealthController {
  constructor(
    private readonly dbHealth: DatabaseHealthService,
    private readonly redisHealth: RedisHealthService,
    private readonly queue: QueueService
  ) {}

  @Get('health')
  @HttpCode(HttpStatus.OK)
  liveness(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  @Get('readiness')
  readiness(): HealthResponse {
    const dbStatus = this.dbHealth.getStatus();
    const dbReady = this.dbHealth.isReady();

    const redisStatus = this.redisHealth.getStatus();
    const redisReady = this.redisHealth.isReady();

    const bullmqStatus = redisStatus === 'not_configured' ? 'not_configured' : this.queue.isReady() ? 'ready' : 'unavailable';
    const bullmqReady = redisStatus === 'not_configured' || this.queue.isReady();

    const checks = { database: dbStatus, redis: redisStatus, bullmq: bullmqStatus };

    if (!dbReady || !redisReady || !bullmqReady) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks
    };
  }
}
