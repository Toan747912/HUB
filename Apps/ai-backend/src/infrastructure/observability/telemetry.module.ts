import { Global, Module } from '@nestjs/common';
import { HealthModule } from '../../health/health.module';
import { QueueModule } from '../jobs/queue.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ObservabilityHttpInterceptor } from './observability-http.interceptor';
import { RequestContextService } from './request-context.service';
import { StructuredLoggerService } from './structured-logger.service';
import { TracerService } from './tracer.service';

@Global()
@Module({
  imports: [HealthModule, QueueModule],
  controllers: [MetricsController],
  providers: [
    TracerService,
    MetricsService,
    RequestContextService,
    StructuredLoggerService,
    ObservabilityHttpInterceptor,
  ],
  exports: [
    TracerService,
    MetricsService,
    RequestContextService,
    StructuredLoggerService,
    ObservabilityHttpInterceptor,
  ],
})
export class TelemetryModule {}
