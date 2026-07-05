import { SemanticRole } from './agent-role';

export type ReasoningStepStatus = 'completed' | 'failed';

/**
 * One role-addressed hop within a collaboration session: the role is
 * resolved to a concrete agentId by RoleResolverService, then executed
 * through the Coordinator (never dispatched directly).
 */
export interface ReasoningStep {
  stepId: string;
  role: SemanticRole;
  agentId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  confidence: number;
  executionTime: number;
  artifactsProduced: string[];
  status: ReasoningStepStatus;
  error?: string;
}
