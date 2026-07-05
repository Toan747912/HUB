import { Module } from '@nestjs/common';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { AgentCoreModule } from '../agent-core/agent-core.module';
import { AgentLifecycleModule } from '../agent-lifecycle/agent-lifecycle.module';
import { AgentRegistryService } from './application/agent-registry.service';
import { AgentRuntimeService } from './application/agent-runtime.service';
import { RuntimeContextFactory } from './application/runtime-context.factory';
import { RuntimeExecutor } from './application/runtime-executor';
import { WorkflowRegistryService } from './application/workflow-registry.service';

@Module({
  imports: [AgentCoreModule, AgentLifecycleModule, TelemetryModule, AuditModule],
  providers: [
    AgentRuntimeService,
    RuntimeExecutor,
    RuntimeContextFactory,
    AgentRegistryService,
    WorkflowRegistryService,
  ],
  exports: [AgentRuntimeService, AgentRegistryService, WorkflowRegistryService],
})
export class AgentRuntimeModule {}
