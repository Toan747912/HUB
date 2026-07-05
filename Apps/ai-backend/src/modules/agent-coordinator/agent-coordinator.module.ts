import { Module } from '@nestjs/common';
import { AgentLearningModule } from '../agent-learning/agent-learning.module';
import { AgentLifecycleModule } from '../agent-lifecycle/agent-lifecycle.module';
import { AgentMemoryModule } from '../agent-memory/agent-memory.module';
import { AgentMessageBusModule } from '../agent-message-bus/agent-message-bus.module';
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { AgentSelectionService } from './application/agent-selection.service';
import { CoordinatorPolicyService } from './application/coordinator-policy.service';
import { CoordinatorRegistryService } from './application/coordinator-registry.service';
import { CoordinatorService } from './application/coordinator.service';
import { COORDINATION_PLAN_REPOSITORY } from './domain/coordination-plan';
import { ExecutionPlanService } from './application/execution-plan.service';
import { PrismaCoordinationPlanRepository } from './repositories/prisma-coordination-plan.repository';

@Module({
  imports: [
    AgentRuntimeModule,
    AgentMessageBusModule,
    AgentLifecycleModule,
    AgentMemoryModule,
    AgentLearningModule,
    TelemetryModule,
    AuditModule,
  ],
  providers: [
    ExecutionPlanService,
    AgentSelectionService,
    CoordinatorPolicyService,
    { provide: COORDINATION_PLAN_REPOSITORY, useClass: PrismaCoordinationPlanRepository },
    CoordinatorRegistryService,
    CoordinatorService,
  ],
  exports: [CoordinatorService, ExecutionPlanService, CoordinatorPolicyService, CoordinatorRegistryService],
})
export class AgentCoordinatorModule {}
