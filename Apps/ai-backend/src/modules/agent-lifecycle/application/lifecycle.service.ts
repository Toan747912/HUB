import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LifecycleState } from '../domain/lifecycle-state';
import { AgentInstance, CreateAgentInstanceInput, LifecycleEventType } from '../domain/lifecycle.types';
import { LifecycleEventsService } from './lifecycle-events.service';
import { LifecycleRegistryService } from './lifecycle-registry.service';

/**
 * Public surface for tracking agent instances through their lifecycle. This
 * service never executes workflow steps - it only records what state a given
 * agent run is in and persists every transition. RuntimeExecutor/
 * AgentRuntimeService call this before and after doing the actual work.
 */
@Injectable()
export class LifecycleService implements OnModuleInit {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly registry: LifecycleRegistryService,
    private readonly events: LifecycleEventsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const recovered = await this.recoverActiveInstances();
    if (recovered.length > 0) {
      this.logger.log(`Recovered ${recovered.length} active agent instance(s) after restart`);
    }
  }

  async createInstance(input: CreateAgentInstanceInput): Promise<AgentInstance> {
    const now = new Date();
    const instance: AgentInstance = {
      instanceId: randomUUID(),
      agentId: input.agentId,
      workflowId: input.workflowId,
      status: LifecycleState.CREATED,
      startedAt: null,
      endedAt: null,
      currentStep: null,
      completedSteps: [],
      failedSteps: [],
      traceId: input.traceId,
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await this.registry.create(instance);
    this.events.emit(LifecycleEventType.AGENT_CREATED, saved);
    return saved;
  }

  async markReady(instanceId: string): Promise<AgentInstance> {
    return this.registry.transition(instanceId, LifecycleState.READY);
  }

  async start(instanceId: string): Promise<AgentInstance> {
    const updated = await this.registry.transition(instanceId, LifecycleState.RUNNING, {
      startedAt: new Date(),
    });
    this.events.emit(LifecycleEventType.AGENT_STARTED, updated);
    return updated;
  }

  async notifyStepStarted(instanceId: string, stepId: string): Promise<AgentInstance> {
    const updated = await this.registry.patch(instanceId, { currentStep: stepId });
    this.events.emit(LifecycleEventType.STEP_STARTED, updated, { stepId });
    return updated;
  }

  async notifyStepCompleted(instanceId: string, stepId: string): Promise<AgentInstance> {
    const current = await this.registry.get(instanceId);
    const completedSteps = [...current.completedSteps, stepId];
    const updated = await this.registry.patch(instanceId, { completedSteps, currentStep: null });
    this.events.emit(LifecycleEventType.STEP_COMPLETED, updated, { stepId });
    return updated;
  }

  async notifyStepFailed(instanceId: string, stepId: string, error: string): Promise<AgentInstance> {
    const current = await this.registry.get(instanceId);
    const failedSteps = [...current.failedSteps, stepId];
    const updated = await this.registry.patch(instanceId, {
      failedSteps,
      currentStep: null,
      lastError: error,
    });
    this.events.emit(LifecycleEventType.STEP_FAILED, updated, { stepId, error });
    return updated;
  }

  async wait(instanceId: string): Promise<AgentInstance> {
    return this.registry.transition(instanceId, LifecycleState.WAITING);
  }

  async resume(instanceId: string): Promise<AgentInstance> {
    return this.registry.transition(instanceId, LifecycleState.RUNNING);
  }

  async complete(instanceId: string): Promise<AgentInstance> {
    const updated = await this.registry.transition(instanceId, LifecycleState.COMPLETED, {
      endedAt: new Date(),
    });
    this.events.emit(LifecycleEventType.AGENT_COMPLETED, updated);
    return updated;
  }

  async fail(instanceId: string, error: string): Promise<AgentInstance> {
    const updated = await this.registry.transition(instanceId, LifecycleState.FAILED, {
      endedAt: new Date(),
      lastError: error,
    });
    this.events.emit(LifecycleEventType.AGENT_FAILED, updated, { error });
    return updated;
  }

  async stop(instanceId: string): Promise<AgentInstance> {
    const updated = await this.registry.transition(instanceId, LifecycleState.STOPPED, {
      endedAt: new Date(),
    });
    this.events.emit(LifecycleEventType.AGENT_STOPPED, updated);
    return updated;
  }

  async getInstance(instanceId: string): Promise<AgentInstance> {
    return this.registry.get(instanceId);
  }

  async recoverActiveInstances(): Promise<AgentInstance[]> {
    return this.registry.recoverAll();
  }
}
