import { Module } from '@nestjs/common';
import { AiBrainModule } from '../../infrastructure/ai-brain/ai-brain.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { SharedModule } from '../../shared/shared.module';
import { DiscoveryPlannerService } from './application/services/discovery-planner.service';

@Module({
  imports: [AiBrainModule, TelemetryModule, AuditModule, SharedModule],
  providers: [DiscoveryPlannerService],
  exports: [DiscoveryPlannerService],
})
export class DiscoveryPlannerModule {}
