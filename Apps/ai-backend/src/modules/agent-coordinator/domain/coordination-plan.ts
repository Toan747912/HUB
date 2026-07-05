import { MemoryScope } from '../../agent-memory/domain/memory-scope';
import { AgentRole, ExecutionMode, ExecutionPolicyName } from './coordination.types';

/**
 * A single agent's participation in a coordination plan, as supplied by the
 * caller. `dependsOn` lists other agents (by id) whose SUCCESS is required
 * before this agent may run. `role` drives the failure policy.
 */
export interface PlannedAgent {
  agentId: string;
  goal: string;
  input?: Record<string, unknown>;
  role: AgentRole;
  dependsOn?: string[];
}

/**
 * Caller-supplied coordination plan input. `sharedMemoryScopes` restricts
 * which MemoryScope values agents in this plan may exchange data through -
 * never directly between agents.
 */
export interface CoordinationPlanInput {
  planId: string;
  agents: PlannedAgent[];
  sharedMemoryScopes: MemoryScope[];
  /** Defaults to 'Sequential' when omitted - the only policy that executes today. */
  executionPolicy?: ExecutionPolicyName;
  /** Output keys the caller expects to find in the merged result; informational only. */
  expectedOutputs?: string[];
}

/**
 * A single position in the resolved, ordered execution sequence. Agents with
 * no dependency relationship between them are grouped together as a
 * "parallel-planned" group, but the coordinator still executes them one at a
 * time, in array order, within that group.
 */
export interface ExecutionGroup {
  mode: ExecutionMode;
  agents: PlannedAgent[];
}

/**
 * The fully resolved plan: a topologically-sorted sequence of execution
 * groups, ready to be handed to the coordinator.
 */
export interface CoordinationPlan {
  planId: string;
  agents: PlannedAgent[];
  executionOrder: ExecutionGroup[];
  sharedMemoryScopes: MemoryScope[];
  executionPolicy: ExecutionPolicyName;
  /** agentId -> the ids it depends on, derived from each PlannedAgent.dependsOn. */
  dependencies: Record<string, string[]>;
  expectedOutputs: string[];
}

/**
 * Repository contract for persisting resolved CoordinationPlans, so
 * CoordinatorRegistryService can recover its cache after a restart instead
 * of staying in-memory-only. Mirrors ILifecycleRepository in agent-lifecycle.
 */
export interface ICoordinationPlanRepository {
  create(plan: CoordinationPlan): Promise<CoordinationPlan>;
  findById(planId: string): Promise<CoordinationPlan | null>;
  findRecent(limit: number): Promise<CoordinationPlan[]>;
}

export const COORDINATION_PLAN_REPOSITORY = Symbol('COORDINATION_PLAN_REPOSITORY');
