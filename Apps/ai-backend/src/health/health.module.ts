import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../infrastructure/cache/redis.module';
import { QueueModule } from '../infrastructure/jobs/queue.module';
import { HealthController } from './health.controller';
import { DatabaseHealthService } from './database-health.service';
import { RedisHealthService } from './redis-health.service';

@Module({
  imports: [MongooseModule, RedisModule, QueueModule],
  controllers: [HealthController],
  providers: [DatabaseHealthService, RedisHealthService],
  exports: [DatabaseHealthService, RedisHealthService],
})
export class HealthModule {}
