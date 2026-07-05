import { Module } from '@nestjs/common';
import { AiBrainModule } from '../../infrastructure/ai-brain/ai-brain.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { SharedModule } from '../../shared/shared.module';
import { KnowledgePlannerService } from './application/services/knowledge-planner.service';

@Module({
  imports: [AiBrainModule, TelemetryModule, AuditModule, SharedModule],
  providers: [KnowledgePlannerService],
  exports: [KnowledgePlannerService],
})
export class KnowledgePlannerModule {}
