import { IAgentResult } from '../../../agent-core/domain/interfaces';
import { AgentRuntimeService } from '../../../agent-runtime/application/agent-runtime.service';
import { AgentMessage } from '../../domain/agent-message';
import { MessagePriority } from '../../domain/message-priority';
import { MessageStatus } from '../../domain/message-status';
import { MessageType } from '../../domain/message-types';
import { AgentRuntimeMessageHandler } from '../agent-runtime-message-handler.service';

function message(overrides: Partial<AgentMessage> = {}): AgentMessage {
  const now = new Date();
  return {
    messageId: 'msg-1',
    traceId: 'trace-1',
    workflowId: 'plan-1',
    senderAgentId: 'coordinator',
    receiverAgentId: 'agent-a',
    messageType: MessageType.REQUEST,
    priority: MessagePriority.NORMAL,
    payload: { requestId: 'req-1', agentId: 'agent-a', goal: 'summarize', input: {}, context: { traceId: 'trace-1', userId: 'user-1', metadata: {} } },
    metadata: {},
    createdAt: now,
    updatedAt: now,
    status: MessageStatus.DELIVERING,
    retryCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('AgentRuntimeMessageHandler', () => {
  it('forwards the message payload to AgentRuntimeService.run() and reports DELIVERED with the runtime result', async () => {
    const result: IAgentResult = { requestId: 'req-1', status: 'success', output: { done: true }, steps: [] };
    const agentRuntime = { run: jest.fn().mockResolvedValue(result) };
    const handler = new AgentRuntimeMessageHandler(agentRuntime as unknown as AgentRuntimeService);

    const outcome = await handler.handle(message());

    expect(agentRuntime.run).toHaveBeenCalledWith(message().payload);
    expect(outcome).toEqual({ status: 'DELIVERED', responsePayload: result });
  });

  it('still reports DELIVERED (with a failure IAgentResult) when the runtime itself resolves a failure', async () => {
    const result: IAgentResult = { requestId: 'req-1', status: 'failure', output: {}, steps: [], error: 'boom' };
    const agentRuntime = { run: jest.fn().mockResolvedValue(result) };
    const handler = new AgentRuntimeMessageHandler(agentRuntime as unknown as AgentRuntimeService);

    const outcome = await handler.handle(message());

    expect(outcome.status).toBe('DELIVERED');
    expect(outcome.responsePayload).toEqual(result);
  });
});
