import { Module } from '@nestjs/common';
import { RedisCircuitBreakerService } from './redis-circuit-breaker.service';

@Module({
  providers: [RedisCircuitBreakerService],
  exports: [RedisCircuitBreakerService],
})
export class ResilienceModule {}
