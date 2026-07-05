import { IAgentContext } from '../../agent-core/domain/interfaces';
import { AgentExecutionOutcome } from '../domain/coordination-result';
import { CoordinationPlan, PlannedAgent } from '../domain/coordination-plan';
import { ExecutionPolicyName } from '../domain/coordination.types';

/**
 * Runs a single planned agent to completion and reports its outcome. Supplied
 * by CoordinatorService so a strategy never has to know how an agent is
 * actually executed (that stays behind AgentRuntimeService).
 */
export type AgentExecutionInvoker = (
  agent: PlannedAgent,
  plan: CoordinationPlan,
  context: IAgentContext,
) => Promise<AgentExecutionOutcome>;

/**
 * Contract every execution policy (Sequential, Parallel, FirstSuccess,
 * MajorityVote, Pipeline) must satisfy. Only the Sequential strategy executes
 * agents today; the others exist so the policy surface is complete and may
 * reject with STRATEGY_NOT_IMPLEMENTED (see CoordinationErrorCode) until a
 * later work package implements them.
 */
export interface IExecutionStrategy {
  readonly name: ExecutionPolicyName;
  run(plan: CoordinationPlan, context: IAgentContext, invoke: AgentExecutionInvoker): Promise<AgentExecutionOutcome[]>;
}
