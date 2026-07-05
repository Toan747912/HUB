import { MessagePriority } from '../domain/message-priority';
import { MessageStatus } from '../domain/message-status';
import { MessageType } from '../domain/message-types';

export interface AgentMessageDocument {
  _id: string;
  traceId: string;
  workflowId: string | null;
  senderAgentId: string;
  receiverAgentId: string;
  messageType: MessageType;
  priority: MessagePriority;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  status: MessageStatus;
  retryCount: number;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
