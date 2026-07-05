import { IAgentContext } from './agent-context.interface';
import { IAgentResult } from './agent-result.interface';

export interface IAgentVerifier {
  verify(result: IAgentResult, context: IAgentContext): Promise<boolean>;
}
