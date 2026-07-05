/**
 * Typed failure crossing the planner -> caller (agent-core/coordinator)
 * boundary. BasePlannerService.execute() wraps whatever the underlying
 * ContextAssemblyService/ResilientLlmGateway/ExplainabilityRulesService threw
 * so no raw Error escapes this module - the original error is preserved via
 * `cause` and its constructor name is what emitObservability already logged
 * before this wrapping happens.
 */
export class PlannerExecutionError extends Error {
  constructor(
    public readonly capability: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PlannerExecutionError';
  }
}
