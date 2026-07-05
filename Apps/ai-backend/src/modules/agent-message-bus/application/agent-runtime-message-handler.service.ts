import { Injectable } from '@nestjs/common';
import { IAgentRequest } from '../../agent-core/domain/interfaces';
import { AgentRuntimeService } from '../../agent-runtime/application/agent-runtime.service';
import { AgentMessage } from '../domain/agent-message';
import { IMessageHandler, MessageHandlerResult } from '../interfaces/message-handler.interface';

/**
 * The single handler the Dispatcher calls for every handler-routed message
 * (REQUEST/COMMAND/RESPONSE/ERROR). This is the only class in the message
 * bus allowed to call AgentRuntimeService. AgentRuntimeService.run() never
 * throws - it resolves a failure IAgentResult internally - so this only
 * distinguishes "could not even reach the runtime" from a runtime response,
 * success or failure; the response payload always carries the real outcome.
 */
@Injectable()
export class AgentRuntimeMessageHandler implements IMessageHandler {
  constructor(private readonly agentRuntime: AgentRuntimeService) {}

  async handle(message: AgentMessage): Promise<MessageHandlerResult> {
    const request = message.payload as unknown as IAgentRequest;
    const result = await this.agentRuntime.run(request);
    return { status: 'DELIVERED', responsePayload: result as unknown as Record<string, unknown> };
  }
}
