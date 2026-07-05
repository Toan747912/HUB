import { IAgentContext } from './agent-context.interface';

export interface IAgentRequest {
  requestId: string;
  agentId: string;
  goal: string;
  input: Record<string, unknown>;
  context: IAgentContext;
}
