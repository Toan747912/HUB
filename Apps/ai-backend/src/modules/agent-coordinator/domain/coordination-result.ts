import { IAgentResult } from '../../agent-core/domain/interfaces';
import { AgentRole } from './coordination.types';

export type AgentOutcomeStatus = 'completed' | 'failed' | 'skipped';

/**
 * The outcome of running a single agent within a coordination plan. Wraps the
 * agent's own IAgentResult (as returned by AgentRuntimeService.run) together
 * with coordination-level bookkeeping (role, whether it was skipped because
 * an upstream dependency failed, etc).
 */
export interface AgentExecutionOutcome {
  agentId: string;
  role: AgentRole;
  status: AgentOutcomeStatus;
  result?: IAgentResult;
  error?: string;
}

export type CoordinationResultStatus = 'success' | 'failure' | 'partial';

/**
 * `outcomes`/`aggregatedOutput` are the original per-agent detail this module
 * shipped with; `participatingAgents`/`completedAgents`/`failedAgents`/
 * `mergedOutput`/`executionTime` are the field names the WP-AI-03G work
 * package contract calls for. Both are populated from the same run so
 * existing and spec-driven callers can each use the shape they expect.
 */
export interface CoordinationResult {
  planId: string;
  status: CoordinationResultStatus;
  outcomes: AgentExecutionOutcome[];
  aggregatedOutput: Record<string, unknown>;
  participatingAgents: string[];
  completedAgents: string[];
  failedAgents: string[];
  mergedOutput: Record<string, unknown>;
  executionTime: number;
  error?: string;
}
