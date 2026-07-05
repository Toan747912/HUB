import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { IAgentContext } from '../../agent-core/domain/interfaces';
import { LearningService } from '../../agent-learning/application/learning.service';
import { CompletedExecutionInput } from '../../agent-learning/domain/experience';
import { MemoryStoreService } from '../../agent-memory/application/memory-store.service';
import { MemoryScope } from '../../agent-memory/domain/memory-scope';
import { CollaborationSession } from '../domain/collaboration-session';
import { CollaborationExecutionError } from '../domain/collaboration.types';
import { ConsensusResult } from '../domain/consensus-result';
import { ReasoningResult } from '../domain/reasoning-result';
import { CollaborationRequest, ICollaborationEngine } from '../interfaces/collaboration.interface';
import { ConsensusService } from './consensus.service';
import { ReasoningService } from './reasoning.service';
import { SynthesisService } from './synthesis.service';

type CollaborationEvent = 'COLLABORATION_STARTED' | 'COLLABORATION_COMPLETED' | 'COLLABORATION_FAILED' | 'CONSENSUS_COMPLETED';

/**
 * Collaborative Reasoning Engine: agents collaborate through semantic roles
 * (resolved by RoleResolverService) instead of fixed agentIds. This service
 * extends the Coordinator only - every reasoning step is executed through
 * CoordinatorService/ReasoningService, never by talking to the Agent Message
 * Bus, AgentRuntimeService, planners, or Memory directly. Mirrors
 * CoordinatorService.coordinate(): internal helpers may throw
 * CollaborationExecutionError, but collaborate() always resolves a
 * status-tagged ReasoningResult, never rejects.
 */
@Injectable()
export class CollaborationService implements ICollaborationEngine, OnModuleInit {
  private readonly logger = new Logger(CollaborationService.name);
  private readonly sessions = new Map<string, CollaborationSession>();

  constructor(
    private readonly reasoning: ReasoningService,
    private readonly consensus: ConsensusService,
    private readonly synthesis: SynthesisService,
    private readonly memoryStore?: MemoryStoreService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService,
    @Optional() private readonly learningService?: LearningService,
  ) {}

  /**
   * Rehydrates this.sessions from the SESSION-scope snapshots persistSession()
   * already writes to agent-memory, so a restart doesn't lose lookup access
   * to sessions completed just before the crash - mirrors how
   * MessageBusService/LifecycleService recover their own state on boot.
   */
  async onModuleInit(): Promise<void> {
    if (!this.memoryStore) return;
    const records = await this.memoryStore.queryByScope(MemoryScope.SESSION);
    let recovered = 0;
    for (const record of records) {
      if (record.key !== 'session') continue;
      const session = record.value as unknown as CollaborationSession;
      if (!session?.sessionId) continue;
      this.sessions.set(session.sessionId, session);
      recovered++;
    }
    if (recovered > 0) {
      this.logger.log(`Recovered ${recovered} collaboration session(s) after restart`);
    }
  }

  async collaborate(request: CollaborationRequest): Promise<ReasoningResult> {
    const startedAt = Date.now();
    const { sessionId, goal, context } = request;
    const consensusStrategy = request.consensusStrategy ?? 'Majority';

    const session: CollaborationSession = {
      sessionId,
      goal,
      participants: [],
      roles: {},
      steps: [],
      artifacts: [],
      messages: [],
      status: 'running',
      startedAt,
    };
    this.sessions.set(sessionId, session);
    this.emitEvent('COLLABORATION_STARTED', sessionId, 'SUCCESS', context);

    try {
      const outputsByRole: Record<string, Record<string, unknown>> = {};

      for (const stepRequest of request.steps) {
        // Each step runs as its own isolated CoordinationPlan (see
        // ReasoningService), so a dependency's output is folded into this
        // step's input here rather than expressed via the coordinator's
        // intra-plan dependsOn mechanism, which only resolves within one plan.
        const dependencyOutputs = Object.fromEntries(
          (stepRequest.dependsOnRoles ?? [])
            .filter((role) => outputsByRole[role])
            .map((role) => [role, outputsByRole[role]]),
        );
        const input =
          Object.keys(dependencyOutputs).length > 0
            ? { ...(stepRequest.input ?? {}), dependencyOutputs }
            : (stepRequest.input ?? {});

        const { step, artifacts } = await this.reasoning.runStep(
          sessionId,
          stepRequest.role,
          stepRequest.goal,
          input,
          context,
        );

        session.steps.push(step);
        session.artifacts.push(...artifacts);
        outputsByRole[stepRequest.role] = step.output;
        session.roles[stepRequest.role] = step.agentId;
        if (!session.participants.includes(step.agentId)) {
          session.participants.push(step.agentId);
        }
      }

      let consensusResult = this.consensus.resolve(consensusStrategy, session.steps);
      if (consensusResult.outcome === 'unresolved') {
        consensusResult = await this.resolveConflict(session, context, consensusResult);
      }
      session.consensus = consensusResult;
      this.emitEvent('CONSENSUS_COMPLETED', sessionId, 'SUCCESS', context, consensusResult.reason);

      const finalResult = this.synthesis.synthesize(sessionId, session.steps, session.artifacts, consensusResult);
      session.finalResult = finalResult;
      session.status = finalResult.status === 'failure' ? 'failed' : 'completed';
      session.endedAt = Date.now();
      await this.persistSession(session, context);

      const durationMs = session.endedAt - startedAt;
      this.emitEvent(
        session.status === 'completed' ? 'COLLABORATION_COMPLETED' : 'COLLABORATION_FAILED',
        sessionId,
        session.status === 'completed' ? 'SUCCESS' : 'FAILURE',
        context,
        undefined,
        durationMs,
      );
      this.metrics?.recordCollaborationOutcome?.({
        status: session.status === 'completed' ? 'success' : 'failure',
        durationMs,
        rolesUsed: Object.keys(session.roles),
        consensusResolved: consensusResult.outcome === 'resolved',
        consensusStrategy,
      });

      this.triggerLearning(session, finalResult, startedAt);

      return finalResult;
    } catch (error) {
      const message =
        error instanceof CollaborationExecutionError || error instanceof Error ? error.message : String(error);
      session.status = 'failed';
      session.endedAt = Date.now();
      const durationMs = session.endedAt - startedAt;

      this.emitEvent('COLLABORATION_FAILED', sessionId, 'FAILURE', context, message, durationMs);
      this.metrics?.recordCollaborationOutcome?.({
        status: 'failure',
        durationMs,
        rolesUsed: session.participants,
        consensusResolved: false,
        consensusStrategy,
      });

      const failedResult: ReasoningResult = {
        sessionId,
        summary: `Collaboration failed: ${message}`,
        artifacts: session.artifacts,
        confidence: 0,
        contributors: session.participants,
        consensus: { strategy: consensusStrategy, outcome: 'unresolved', reason: message },
        status: 'failure',
      };
      this.triggerLearning(session, failedResult, startedAt);
      return failedResult;
    }
  }

  /**
   * Best-effort hand-off into the Adaptive Learning Engine. Learning is a
   * pure consumer of completed sessions - a failure here must never fail
   * the collaboration result already computed above.
   */
  private triggerLearning(session: CollaborationSession, result: ReasoningResult, startedAt: number): void {
    if (!this.learningService) return;

    const endedAt = session.endedAt ?? Date.now();
    const input: CompletedExecutionInput = {
      workflowId: session.sessionId,
      goal: session.goal,
      sourceType: 'collaboration',
      status: result.status === 'partial' ? 'partial' : result.status === 'success' ? 'success' : 'failure',
      participants: session.participants,
      roles: session.roles,
      confidence: result.confidence,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      consensus: session.consensus
        ? {
            strategy: session.consensus.strategy,
            outcome: session.consensus.outcome,
            agreementScore: session.consensus.agreementScore,
          }
        : undefined,
    };

    void this.learningService.runCycle(input).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.structuredLogger?.log({
        operation: 'COLLABORATION_LEARNING_TRIGGER_FAILED',
        status: 'FAILURE',
        latencyMs: 0,
        aggregateId: session.sessionId,
        errorCode: message,
      });
    });
  }

  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Conflict resolution path (WP-AI-03I): an unresolved consensus routes
   * through a Critic step and then a Reviewer step - both executed exactly
   * like any other reasoning step (role-resolved, dispatched through the
   * Coordinator) - before final synthesis.
   */
  private async resolveConflict(
    session: CollaborationSession,
    context: IAgentContext,
    unresolved: ConsensusResult,
  ): Promise<ConsensusResult> {
    const conflictingOutputs = session.steps.map((step) => ({
      role: step.role,
      agentId: step.agentId,
      output: step.output,
    }));

    const critic = await this.reasoning.runStep(
      session.sessionId,
      'Critic',
      `Critique conflicting outputs for goal: ${session.goal}`,
      { conflictingOutputs },
      context,
    );
    session.steps.push(critic.step);
    session.artifacts.push(...critic.artifacts);
    session.roles['Critic'] = critic.step.agentId;
    if (!session.participants.includes(critic.step.agentId)) {
      session.participants.push(critic.step.agentId);
    }

    const reviewer = await this.reasoning.runStep(
      session.sessionId,
      'Reviewer',
      `Review the critique and decide the final outcome for goal: ${session.goal}`,
      { conflictingOutputs, critique: critic.step.output },
      context,
    );
    session.steps.push(reviewer.step);
    session.artifacts.push(...reviewer.artifacts);
    session.roles['Reviewer'] = reviewer.step.agentId;
    if (!session.participants.includes(reviewer.step.agentId)) {
      session.participants.push(reviewer.step.agentId);
    }

    if (reviewer.step.status === 'completed') {
      return { strategy: unresolved.strategy, outcome: 'resolved', decision: reviewer.step.output, agreementScore: 1 };
    }

    return { ...unresolved, reason: reviewer.step.error ?? unresolved.reason };
  }

  private async persistSession(session: CollaborationSession, context: IAgentContext): Promise<void> {
    await this.memoryStore?.set(
      {
        scope: MemoryScope.SESSION,
        scopeId: session.sessionId,
        key: 'session',
        value: session as unknown as Record<string, unknown>,
      },
      { traceId: context.traceId, userId: context.userId },
    );
  }

  private emitEvent(
    operation: CollaborationEvent,
    sessionId: string,
    status: 'SUCCESS' | 'FAILURE',
    context: IAgentContext,
    errorMessage?: string,
    latencyMs = 0,
  ): void {
    this.structuredLogger?.log({
      operation,
      status,
      latencyMs,
      aggregateId: sessionId,
      errorCode: errorMessage,
    });
    this.auditLog
      ?.recordSecurityEvent({
        traceId: context.traceId,
        userId: context.userId,
        operation,
        resource: `CollaborationSession:${sessionId}`,
        after: errorMessage ? { error: errorMessage } : undefined,
      })
      .catch(() => undefined);
  }
}
