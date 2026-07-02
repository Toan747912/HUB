import { Module } from '@nestjs/common';
import { RedisModule } from '../cache/redis.module';
import { ResilienceModule } from '../resilience/resilience.module';
import { QueueService } from './queue.service';

@Module({
  imports: [RedisModule, ResilienceModule],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule {}
