import { IAgentContext } from '../../agent-core/domain/interfaces';
import { ToolMetadata } from './tool-metadata';

export type ToolExecutionStatus = 'SUCCESS' | 'FAILURE';

export interface ToolExecutionResult {
  toolId: string;
  status: ToolExecutionStatus;
  durationMs: number;
  output?: Record<string, unknown>;
  error?: { code: string; message: string };
}

export interface IAgentTool {
  readonly metadata: ToolMetadata;
  execute(input: Record<string, unknown>, context: IAgentContext): Promise<Record<string, unknown>>;
}

export enum ToolErrorCode {
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  EXECUTION_FAILED = 'EXECUTION_FAILED',
  DUPLICATE_TOOL = 'DUPLICATE_TOOL',
}

export class ToolExecutionError extends Error {
  constructor(
    public readonly code: ToolErrorCode,
    message: string,
    public readonly toolId?: string,
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}
