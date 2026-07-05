import { MessagePriority } from './message-priority';
import { MessageStatus } from './message-status';
import { MessageType } from './message-types';

export interface AgentMessage {
  messageId: string;
  traceId: string;
  workflowId: string | null;
  senderAgentId: string;
  receiverAgentId: string;
  messageType: MessageType;
  priority: MessagePriority;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  status: MessageStatus;
  retryCount: number;
  lastError: string | null;
}
