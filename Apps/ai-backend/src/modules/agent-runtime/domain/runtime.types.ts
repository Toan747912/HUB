export type RuntimeStepKind = 'planner' | 'tool' | 'memory' | 'verification';

/**
 * Declarative description of one workflow step: what kind of layer executes
 * it (planner/tool/memory/verification) and which registered capability,
 * tool name, or memory key it targets.
 */
export interface RuntimeStepDefinition {
  stepId: string;
  name: string;
  kind: RuntimeStepKind;
  target: string;
  input?: Record<string, unknown>;
}

export interface RuntimeWorkflowDefinition {
  workflowId: string;
  name: string;
  steps: RuntimeStepDefinition[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  workflowId: string;
}

export enum RuntimeErrorCode {
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  PLANNER_FAILURE = 'PLANNER_FAILURE',
  TOOL_FAILURE = 'TOOL_FAILURE',
  MEMORY_FAILURE = 'MEMORY_FAILURE',
  INVALID_RESULT = 'INVALID_RESULT',
}

export class RuntimeExecutionError extends Error {
  constructor(
    public readonly code: RuntimeErrorCode,
    message: string,
    public readonly stepId?: string,
  ) {
    super(message);
    this.name = 'RuntimeExecutionError';
  }
}
