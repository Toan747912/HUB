import { IAgentStep } from './agent-step.interface';

export interface IAgentWorkflow {
  workflowId: string;
  name: string;
  steps: IAgentStep[];
}
