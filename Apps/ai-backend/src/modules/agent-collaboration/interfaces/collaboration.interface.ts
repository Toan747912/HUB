import { IAgentContext } from '../../agent-core/domain/interfaces';
import { SemanticRole } from '../domain/agent-role';
import { ConsensusStrategyName } from '../domain/collaboration.types';
import { ReasoningResult } from '../domain/reasoning-result';

export interface CollaborationStepRequest {
  role: SemanticRole;
  goal: string;
  input?: Record<string, unknown>;
  /** Roles (not agentIds) this step depends on; resolved to agentIds at run time. */
  dependsOnRoles?: SemanticRole[];
}

export interface CollaborationRequest {
  sessionId: string;
  goal: string;
  steps: CollaborationStepRequest[];
  /** Defaults to 'Majority' when omitted - the only strategy that resolves today. */
  consensusStrategy?: ConsensusStrategyName;
  context: IAgentContext;
}

/**
 * Public entry point of the Collaborative Reasoning Engine. Mirrors
 * ICoordinator.coordinate(): internal helpers may throw
 * CollaborationExecutionError, but collaborate() always resolves a
 * status-tagged ReasoningResult, never rejects.
 */
export interface ICollaborationEngine {
  collaborate(request: CollaborationRequest): Promise<ReasoningResult>;
}
