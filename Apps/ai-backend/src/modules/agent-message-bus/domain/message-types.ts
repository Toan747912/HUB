import type { AgentMessage } from './agent-message';
import { MessageStatus } from './message-status';

export enum MessageType {
  REQUEST = 'REQUEST',
  RESPONSE = 'RESPONSE',
  EVENT = 'EVENT',
  COMMAND = 'COMMAND',
  ERROR = 'ERROR',
  NOTIFICATION = 'NOTIFICATION',
}

/**
 * REQUEST/COMMAND/RESPONSE/ERROR route to exactly one registered agent
 * (validated against the Agent Registry); EVENT/NOTIFICATION fan out to
 * whichever subscriber callbacks registered for that receiver instead.
 */
export const HANDLER_ROUTED_MESSAGE_TYPES: ReadonlySet<MessageType> = new Set([
  MessageType.REQUEST,
  MessageType.COMMAND,
  MessageType.RESPONSE,
  MessageType.ERROR,
]);

export enum RoutingFailureReason {
  UNKNOWN_RECEIVER = 'UNKNOWN_RECEIVER',
  NO_HANDLER = 'NO_HANDLER',
}

export class MessageRoutingError extends Error {
  constructor(
    public readonly reason: RoutingFailureReason,
    message: string,
    public readonly receiverAgentId?: string,
  ) {
    super(message);
    this.name = 'MessageRoutingError';
  }
}

export enum MessageBusErrorCode {
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
}

/**
 * Typed failure for MessageBusService's own boundary methods (dispatch/retry/
 * deadLetter/replay), mirroring MessageRoutingError. Ordinary routing/delivery
 * failures still resolve as a status-tagged AgentMessage - this is only for
 * the exceptional "no such message" case.
 */
export class MessageBusError extends Error {
  constructor(
    public readonly code: MessageBusErrorCode,
    message: string,
    public readonly messageId?: string,
  ) {
    super(message);
    this.name = 'MessageBusError';
  }
}

/**
 * What MessageRouterService.resolve() found for a given receiver. The
 * Dispatcher branches on `kind` to decide whether to call the single
 * agent-runtime handler or fan out to subscriber callbacks; `ok: false`
 * carries a typed reason rather than throwing.
 */
export type RoutingResolution =
  | { ok: true; kind: 'handler'; receiverAgentId: string }
  | { ok: true; kind: 'subscribers'; receiverAgentId: string; subscriberCount: number }
  | { ok: false; reason: RoutingFailureReason; receiverAgentId: string };

export interface IMessageRepository {
  create(message: AgentMessage): Promise<AgentMessage>;
  update(messageId: string, patch: Partial<AgentMessage>): Promise<AgentMessage>;
  findById(messageId: string): Promise<AgentMessage | null>;
  findByStatus(statuses: MessageStatus[]): Promise<AgentMessage[]>;
  findByTraceId(traceId: string): Promise<AgentMessage[]>;
  /** Deletes terminal-status (DELIVERED/DEAD_LETTER) messages last updated before `cutoff`. */
  deleteTerminalOlderThan(cutoff: Date): Promise<number>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
