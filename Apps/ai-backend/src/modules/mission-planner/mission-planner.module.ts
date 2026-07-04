import { Module } from '@nestjs/common';
import { AiBrainModule } from '../../infrastructure/ai-brain/ai-brain.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { SharedModule } from '../../shared/shared.module';
import { MissionPlannerService } from './application/services/mission-planner.service';

@Module({
  imports: [AiBrainModule, TelemetryModule, AuditModule, SharedModule],
  providers: [MissionPlannerService],
  exports: [MissionPlannerService],
})
export class MissionPlannerModule {}
