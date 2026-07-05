import { IAgentContext, IAgentTool as ICoreAgentTool } from '../../agent-core/domain/interfaces';
import { ToolRegistryService } from './tool-registration.service';

/**
 * Adapts a rich agent-tools IAgentTool into the lean IAgentTool contract that
 * RuntimeExecutor/agent-core's ToolRegistryService already consume, so
 * production tools run through this module's validation/observability layer
 * without any change to Agent Runtime orchestration.
 */
export class CoreToolAdapter implements ICoreAgentTool {
  constructor(
    readonly name: string,
    readonly description: string,
    private readonly toolId: string,
    private readonly registry: ToolRegistryService,
  ) {}

  async execute(input: Record<string, unknown>, context: IAgentContext): Promise<Record<string, unknown>> {
    const result = await this.registry.execute(this.toolId, input, context);
    if (result.status === 'FAILURE') {
      throw new Error(result.error?.message ?? `Tool execution failed: ${this.toolId}`);
    }
    return result.output ?? {};
  }
}
