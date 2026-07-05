import { AgentResultStatus } from '../types/agent-core.types';
import { IAgentStep } from './agent-step.interface';

export interface IAgentResult {
  requestId: string;
  status: AgentResultStatus;
  output: Record<string, unknown>;
  steps: IAgentStep[];
  error?: string;
}
