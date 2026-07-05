/**
 * An agent's participation requirement within a coordination plan. Mirrors the
 * "mandatory vs optional" failure policy from the work package: a mandatory
 * agent failing stops the whole coordination, an optional agent failing lets
 * the coordinator continue with the remaining agents.
 */
export type AgentRole = 'mandatory' | 'optional';

/**
 * How multiple agents are grouped for execution. Parallel groups are planned
 * (agents in the same group have no dependency on each other) but are still
 * executed sequentially for now, per the work package.
 */
export type ExecutionMode = 'single' | 'sequential' | 'parallel-planned';

export type AggregationStrategy = 'MERGE' | 'FIRST_SUCCESS' | 'ALL_SUCCESS' | 'BEST_CONFIDENCE';

/**
 * Named execution policies a CoordinationPlan may request (work package
 * WP-AI-03G). Only 'Sequential' executes today; the others exist as strategy
 * contracts registered in CoordinatorPolicyService and resolve to a
 * STRATEGY_NOT_IMPLEMENTED failure until implemented.
 */
export type ExecutionPolicyName = 'Sequential' | 'Parallel' | 'FirstSuccess' | 'MajorityVote' | 'Pipeline';

export enum CoordinationErrorCode {
  PLAN_NOT_FOUND = 'PLAN_NOT_FOUND',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  CYCLIC_DEPENDENCY = 'CYCLIC_DEPENDENCY',
  UNKNOWN_DEPENDENCY = 'UNKNOWN_DEPENDENCY',
  MANDATORY_AGENT_FAILED = 'MANDATORY_AGENT_FAILED',
  INVALID_AGGREGATION = 'INVALID_AGGREGATION',
  INVALID_MEMORY_SCOPE = 'INVALID_MEMORY_SCOPE',
  STRATEGY_NOT_IMPLEMENTED = 'STRATEGY_NOT_IMPLEMENTED',
}

/**
 * Agents may only exchange data through these memory scopes - never
 * directly. AGENT/STEP/TEMP scopes exist in MemoryScope but are excluded
 * here: AGENT is single-agent private state, STEP/TEMP are runtime-internal.
 */
export const ALLOWED_SHARED_MEMORY_SCOPES = ['SESSION', 'WORKFLOW', 'GLOBAL'] as const;

export class CoordinationExecutionError extends Error {
  constructor(
    public readonly code: CoordinationErrorCode,
    message: string,
    public readonly agentId?: string,
  ) {
    super(message);
    this.name = 'CoordinationExecutionError';
  }
}
