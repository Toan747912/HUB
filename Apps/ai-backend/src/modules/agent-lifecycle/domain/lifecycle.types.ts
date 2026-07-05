import { LifecycleState } from './lifecycle-state';

export interface AgentInstance {
  instanceId: string;
  agentId: string;
  workflowId: string;
  status: LifecycleState;
  startedAt: Date | null;
  endedAt: Date | null;
  currentStep: string | null;
  completedSteps: string[];
  failedSteps: string[];
  traceId: string;
  userId: string | null;
  sessionId: string | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentInstanceInput {
  agentId: string;
  workflowId: string;
  traceId: string;
  userId?: string | null;
  sessionId?: string | null;
}

export enum LifecycleEventType {
  AGENT_CREATED = 'AGENT_CREATED',
  AGENT_STARTED = 'AGENT_STARTED',
  STEP_STARTED = 'STEP_STARTED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  STEP_FAILED = 'STEP_FAILED',
  AGENT_COMPLETED = 'AGENT_COMPLETED',
  AGENT_FAILED = 'AGENT_FAILED',
  AGENT_STOPPED = 'AGENT_STOPPED',
}

export interface ILifecycleRepository {
  create(instance: AgentInstance): Promise<AgentInstance>;
  update(instanceId: string, patch: Partial<AgentInstance>): Promise<AgentInstance>;
  findById(instanceId: string): Promise<AgentInstance | null>;
  findActive(): Promise<AgentInstance[]>;
  /** Deletes terminal-status (COMPLETED/FAILED/STOPPED) instances last updated before `cutoff`. */
  deleteTerminalOlderThan(cutoff: Date): Promise<number>;
}

export const LIFECYCLE_REPOSITORY = Symbol('LIFECYCLE_REPOSITORY');

export enum LifecycleErrorCode {
  INSTANCE_NOT_FOUND = 'INSTANCE_NOT_FOUND',
}

/**
 * Typed failure for the lifecycle module's own boundary methods, mirroring
 * CoordinationExecutionError/CollaborationExecutionError. Every state
 * transition already goes through assertValidLifecycleTransition; this is
 * only for the exceptional "no such instance" case.
 */
export class LifecycleError extends Error {
  constructor(
    public readonly code: LifecycleErrorCode,
    message: string,
    public readonly instanceId?: string,
  ) {
    super(message);
    this.name = 'LifecycleError';
  }
}
