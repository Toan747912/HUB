import { IAgentRequest } from './agent-request.interface';
import { IAgentResult } from './agent-result.interface';

export interface IAgent {
  readonly id: string;
  readonly name: string;
  run(request: IAgentRequest): Promise<IAgentResult>;
}
