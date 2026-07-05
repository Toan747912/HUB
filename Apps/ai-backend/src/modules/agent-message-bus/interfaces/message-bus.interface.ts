import { AgentMessage } from '../domain/agent-message';
import { MessageEnvelope } from '../domain/message-envelope';
import { MessageSubscriberCallback } from './message-subscriber.interface';

/**
 * Public surface of the Agent Message Bus (WP-AI-03H) - the only
 * communication mechanism between agents. Every method resolves rather than
 * throws for ordinary routing/delivery failures; callers read the outcome
 * off the returned AgentMessage's status/lastError.
 */
export interface IMessageBus {
  publish(envelope: MessageEnvelope): Promise<AgentMessage>;
  subscribe(receiverAgentId: string, callback: MessageSubscriberCallback): string;
  unsubscribe(receiverAgentId: string, subscriberId: string): void;
  dispatch(messageId: string): Promise<AgentMessage>;
  retry(messageId: string): Promise<AgentMessage>;
  deadLetter(messageId: string, reason: string): Promise<AgentMessage>;
  replay(messageId: string): Promise<AgentMessage>;
  lookup(messageId: string): Promise<AgentMessage | null>;
}
