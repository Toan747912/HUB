import { AgentMessage } from '../domain/agent-message';

export interface MessageHandlerResult {
  status: 'DELIVERED' | 'FAILED';
  responsePayload?: Record<string, unknown> | null;
  error?: string;
}

/**
 * Contract for the single handler-routed delivery path (REQUEST/COMMAND/
 * RESPONSE/ERROR). The default implementation, AgentRuntimeMessageHandler,
 * is the only thing in this module allowed to call AgentRuntimeService.
 */
export interface IMessageHandler {
  handle(message: AgentMessage): Promise<MessageHandlerResult>;
}
