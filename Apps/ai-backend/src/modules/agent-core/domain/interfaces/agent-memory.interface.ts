import { IAgentContext } from './agent-context.interface';

export interface IAgentMemory {
  read(key: string, context: IAgentContext): Promise<unknown | null>;
  write(key: string, value: unknown, context: IAgentContext): Promise<void>;
}
