import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AgentRegistryService } from '../../agent-runtime/application/agent-registry.service';
import {
  HANDLER_ROUTED_MESSAGE_TYPES,
  MessageType,
  RoutingFailureReason,
  RoutingResolution,
} from '../domain/message-types';
import { IMessageSubscriber, MessageSubscriberCallback } from '../interfaces/message-subscriber.interface';

/**
 * Resolves who should receive a message and how, but never invokes an agent
 * itself. REQUEST/COMMAND/RESPONSE/ERROR messages route to a registered
 * agent - validated against the same AgentRegistryService AgentRuntimeService
 * reads from - and are rejected as UNKNOWN_RECEIVER otherwise. EVENT/
 * NOTIFICATION messages fan out to whichever subscribers registered for that
 * receiver, if any; an empty subscriber list is not a routing failure.
 */
@Injectable()
export class MessageRouterService {
  private readonly subscribers = new Map<string, IMessageSubscriber[]>();

  constructor(private readonly agentRegistry: AgentRegistryService) {}

  resolve(receiverAgentId: string, messageType: MessageType): RoutingResolution {
    if (!HANDLER_ROUTED_MESSAGE_TYPES.has(messageType)) {
      const subscriberCount = (this.subscribers.get(receiverAgentId) ?? []).length;
      return { ok: true, kind: 'subscribers', receiverAgentId, subscriberCount };
    }

    if (!this.agentRegistry.get(receiverAgentId)) {
      return { ok: false, reason: RoutingFailureReason.UNKNOWN_RECEIVER, receiverAgentId };
    }

    return { ok: true, kind: 'handler', receiverAgentId };
  }

  subscribe(receiverAgentId: string, callback: MessageSubscriberCallback): string {
    const subscriberId = randomUUID();
    const subs = this.subscribers.get(receiverAgentId) ?? [];
    subs.push({ subscriberId, receiverAgentId, callback });
    this.subscribers.set(receiverAgentId, subs);
    return subscriberId;
  }

  unsubscribe(receiverAgentId: string, subscriberId: string): void {
    const subs = this.subscribers.get(receiverAgentId);
    if (!subs) return;
    this.subscribers.set(
      receiverAgentId,
      subs.filter((sub) => sub.subscriberId !== subscriberId),
    );
  }

  getSubscribers(receiverAgentId: string): IMessageSubscriber[] {
    return this.subscribers.get(receiverAgentId) ?? [];
  }
}
