import { Module } from '@nestjs/common';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { AgentCoordinatorModule } from '../agent-coordinator/agent-coordinator.module';
import { AgentLearningModule } from '../agent-learning/agent-learning.module';
import { AgentMemoryModule } from '../agent-memory/agent-memory.module';
import { CollaborationService } from './application/collaboration.service';
import { ConsensusService } from './application/consensus.service';
import { ReasoningService } from './application/reasoning.service';
import { RoleResolverService } from './application/role-resolver.service';
import { SynthesisService } from './application/synthesis.service';

/**
 * Collaborative Reasoning Engine (WP-AI-03I). Extends the Coordinator only:
 * imports AgentCoordinatorModule to reach CoordinatorService and
 * AgentMemoryModule to persist artifacts/sessions, but never imports
 * AgentRuntimeModule, AgentMessageBusModule, or AgentLifecycleModule directly
 * - those stay behind the Coordinator, unmodified.
 */
@Module({
  imports: [AgentCoordinatorModule, AgentMemoryModule, AgentLearningModule, TelemetryModule, AuditModule],
  providers: [RoleResolverService, ReasoningService, ConsensusService, SynthesisService, CollaborationService],
  exports: [CollaborationService, RoleResolverService, ConsensusService, SynthesisService],
})
export class AgentCollaborationModule {}
