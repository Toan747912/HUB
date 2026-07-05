import { Module } from '@nestjs/common';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { ExperienceExtractorService } from './application/experience-extractor.service';
import { FeedbackService } from './application/feedback.service';
import { KnowledgeBuilderService } from './application/knowledge-builder.service';
import { LearningService } from './application/learning.service';
import { PatternDetectorService } from './application/pattern-detector.service';
import { RecommendationEngineService } from './application/recommendation-engine.service';
import { LEARNING_REPOSITORY } from './interfaces/learning.interface';
import { PrismaLearningRepository } from './repositories/prisma-learning.repository';

/**
 * Adaptive Learning Engine (WP-AI-03J). A pure consumer: every completed
 * execution it learns from arrives as a plain CompletedExecutionInput value
 * (see domain/experience.ts) handed in by the caller, so this module never
 * imports agent-core/agent-runtime/agent-coordinator/agent-message-bus/
 * agent-lifecycle/agent-tools/agent-memory/agent-collaboration or the AI
 * Brain planner layer, and never writes back to any of their data. Only
 * TelemetryModule/AuditModule (read-only reuse of existing observability +
 * audit infrastructure) and Prisma (its own four tables) are wired in here.
 */
@Module({
  imports: [TelemetryModule, AuditModule],
  providers: [
    { provide: LEARNING_REPOSITORY, useClass: PrismaLearningRepository },
    ExperienceExtractorService,
    PatternDetectorService,
    KnowledgeBuilderService,
    RecommendationEngineService,
    FeedbackService,
    LearningService,
  ],
  exports: [LearningService, FeedbackService],
})
export class AgentLearningModule {}
