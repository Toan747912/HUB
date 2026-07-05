import { AgentStepStatus } from '../types/agent-core.types';

export interface IAgentStep {
  stepId: string;
  name: string;
  status: AgentStepStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}
