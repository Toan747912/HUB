import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IAgentContext } from '../../agent-core/domain/interfaces';
import { CoordinatorService } from '../../agent-coordinator/application/coordinator.service';
import { MemoryStoreService } from '../../agent-memory/application/memory-store.service';
import { MemoryScope } from '../../agent-memory/domain/memory-scope';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { SemanticRole } from '../domain/agent-role';
import { ArtifactType, ReasoningArtifact } from '../domain/reasoning-result';
import { ReasoningStep } from '../domain/reasoning-step';
import { RoleResolverService } from './role-resolver.service';

export interface ReasoningStepOutcome {
  step: ReasoningStep;
  artifacts: ReasoningArtifact[];
}

/**
 * Executes a single role-addressed reasoning step. The role is resolved to an
 * agentId (RoleResolverService), then handed to the existing Coordinator as a
 * single-agent CoordinationPlan - this module extends the Coordinator only
 * and never talks to the Agent Message Bus or AgentRuntimeService directly.
 */
@Injectable()
export class ReasoningService {
  constructor(
    private readonly roleResolver: RoleResolverService,
    private readonly coordinator: CoordinatorService,
    private readonly memoryStore?: MemoryStoreService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly metrics?: MetricsService,
  ) {}

  async runStep(
    sessionId: string,
    role: SemanticRole,
    goal: string,
    input: Record<string, unknown>,
    context: IAgentContext,
  ): Promise<ReasoningStepOutcome> {
    const startedAt = Date.now();
    const stepId = randomUUID();
    const agentId = this.roleResolver.resolve(role);

    this.structuredLogger?.log({
      operation: 'ROLE_ASSIGNED',
      status: 'SUCCESS',
      latencyMs: 0,
      aggregateId: `${sessionId}:${role}:${agentId}`,
    });

    // Each reasoning step is its own single-agent CoordinationPlan (a fresh
    // planId per step), so cross-step dependency data is folded into `input`
    // by CollaborationService rather than expressed via PlannedAgent.dependsOn
    // - that field only resolves within one plan's own agent list.
    const coordination = await this.coordinator.coordinate({
      plan: {
        planId: `${sessionId}:${stepId}`,
        agents: [{ agentId, goal, input, role: 'mandatory' }],
        sharedMemoryScopes: [MemoryScope.SESSION],
        executionPolicy: 'Sequential',
      },
      context,
      aggregation: 'MERGE',
    });

    const outcome = coordination.outcomes[0];
    const executionTime = Date.now() - startedAt;
    // AgentRuntimeService merges a workflow's step outputs keyed by stepId
    // (e.g. { research: { confidence, artifacts } }); reasoning steps in this
    // engine run a single-step workflow per role, so unwrap that one nesting
    // level to get at the actual payload instead of hardcoding a stepId name.
    const rawOutput = outcome?.result?.output ?? {};
    const output = this.unwrapStepOutput(rawOutput);
    const confidence = typeof output.confidence === 'number' ? (output.confidence as number) : 0.5;
    const artifacts = await this.persistArtifacts(sessionId, role, agentId, output, context);

    const step: ReasoningStep = {
      stepId,
      role,
      agentId,
      input,
      output,
      confidence,
      executionTime,
      artifactsProduced: artifacts.map((artifact) => artifact.artifactId),
      status: outcome?.status === 'completed' ? 'completed' : 'failed',
      error: outcome?.error,
    };

    await this.memoryStore?.set(
      {
        scope: MemoryScope.SESSION,
        scopeId: sessionId,
        key: `step:${stepId}`,
        value: step as unknown as Record<string, unknown>,
        tags: [role],
      },
      { traceId: context.traceId, userId: context.userId },
    );

    this.metrics?.recordPlannerOutcome?.({
      capability: `agent_collaboration_${role}`,
      status: step.status === 'completed' ? 'SUCCESS' : 'FAILURE',
      latencyMs: executionTime,
      confidence,
      fallbackUsed: false,
      timedOut: false,
    });

    return { step, artifacts };
  }

  private unwrapStepOutput(output: Record<string, unknown>): Record<string, unknown> {
    const keys = Object.keys(output);
    if (keys.length !== 1) {
      return output;
    }
    const value = output[keys[0]];
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : output;
  }

  private async persistArtifacts(
    sessionId: string,
    role: SemanticRole,
    agentId: string,
    output: Record<string, unknown>,
    context: IAgentContext,
  ): Promise<ReasoningArtifact[]> {
    const rawArtifacts = Array.isArray(output.artifacts)
      ? (output.artifacts as Array<{ type: ArtifactType; content: Record<string, unknown> }>)
      : [];

    const artifacts: ReasoningArtifact[] = [];
    for (const raw of rawArtifacts) {
      const artifact: ReasoningArtifact = {
        artifactId: randomUUID(),
        type: raw.type,
        producedBy: role,
        agentId,
        content: raw.content,
        createdAt: Date.now(),
      };
      artifacts.push(artifact);

      await this.memoryStore?.set(
        {
          scope: MemoryScope.SESSION,
          scopeId: sessionId,
          key: `artifact:${artifact.artifactId}`,
          value: artifact as unknown as Record<string, unknown>,
          tags: [artifact.type, role],
        },
        { traceId: context.traceId, userId: context.userId },
      );
    }

    return artifacts;
  }
}
