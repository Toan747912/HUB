import { Module } from '@nestjs/common';
import { AgentMemoryModule } from '../agent-memory/agent-memory.module';
import { DiscoveryPlannerModule } from '../discovery-planner/discovery-planner.module';
import { EvidencePlannerModule } from '../evidence-planner/evidence-planner.module';
import { KnowledgePlannerModule } from '../knowledge-planner/knowledge-planner.module';
import { MissionPlannerModule } from '../mission-planner/mission-planner.module';
import { TeachingPlannerModule } from '../teaching-planner/teaching-planner.module';
import { MemoryAdapterService } from './infrastructure/memory-adapter.service';
import { PlannerAdapterService } from './infrastructure/planner-adapter.service';
import { ToolRegistryService } from './infrastructure/tool-registry.service';
import { VerificationPipelineService } from './infrastructure/verification-pipeline.service';

@Module({
  imports: [
    MissionPlannerModule,
    DiscoveryPlannerModule,
    KnowledgePlannerModule,
    EvidencePlannerModule,
    TeachingPlannerModule,
    AgentMemoryModule,
  ],
  providers: [
    PlannerAdapterService,
    ToolRegistryService,
    MemoryAdapterService,
    VerificationPipelineService,
  ],
  exports: [PlannerAdapterService, ToolRegistryService, MemoryAdapterService, VerificationPipelineService],
})
export class AgentCoreModule {}
