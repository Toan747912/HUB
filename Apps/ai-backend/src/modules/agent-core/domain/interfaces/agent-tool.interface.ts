import { IAgentContext } from './agent-context.interface';

export interface IAgentTool {
  readonly name: string;
  readonly description: string;
  execute(
    input: Record<string, unknown>,
    context: IAgentContext,
  ): Promise<Record<string, unknown>>;
}
