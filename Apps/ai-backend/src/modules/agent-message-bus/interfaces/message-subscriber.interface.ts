import { AgentMessage } from '../domain/agent-message';

export type MessageSubscriberCallback = (message: AgentMessage) => void | Promise<void>;

export interface IMessageSubscriber {
  subscriberId: string;
  receiverAgentId: string;
  callback: MessageSubscriberCallback;
}
