import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { AgentMessage } from '../domain/agent-message';
import { MessageEnvelope } from '../domain/message-envelope';
import { MessageStatus } from '../domain/message-status';
import { MessageBusError, MessageBusErrorCode } from '../domain/message-types';
import { IMessageBus } from '../interfaces/message-bus.interface';
import { MessageSubscriberCallback } from '../interfaces/message-subscriber.interface';
import { MessageDispatcherService } from './message-dispatcher.service';
import { MessageRouterService } from './message-router.service';
import { MessageStoreService } from './message-store.service';

const IN_FLIGHT_STATUSES = [MessageStatus.QUEUED, MessageStatus.DELIVERING, MessageStatus.RETRYING];

/**
 * Public entry point for the Agent Message Bus (WP-AI-03H) - the only
 * communication mechanism between agents. publish() persists a message,
 * queues it, and dispatches it through MessageDispatcherService, which is
 * the sole caller of AgentRuntimeService; nothing here invokes an agent
 * directly. Every method resolves rather than throws for ordinary
 * routing/delivery failures - callers read the outcome off the returned
 * AgentMessage's status/lastError.
 */
@Injectable()
export class MessageBusService implements IMessageBus, OnModuleInit {
  private readonly logger = new Logger(MessageBusService.name);
  private inFlightCount = 0;

  constructor(
    private readonly store: MessageStoreService,
    private readonly router: MessageRouterService,
    private readonly dispatcher: MessageDispatcherService,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService,
  ) {}

  /**
   * Recovers messages left QUEUED/DELIVERING/RETRYING by a crash and resumes
   * dispatching them, so an interrupted delivery does not stall forever.
   */
  async onModuleInit(): Promise<void> {
    const recovered = await this.store.findByStatus(IN_FLIGHT_STATUSES);
    for (const message of recovered) {
      await this.dispatcher.dispatch(message).catch(() => undefined);
    }
    if (recovered.length > 0) {
      this.logger.log(`Recovered ${recovered.length} in-flight agent message(s) after restart`);
    }
  }

  async publish(envelope: MessageEnvelope): Promise<AgentMessage> {
    // Created directly in QUEUED status - a create-then-update pair here
    // would be two writes to the same document with nothing that needs to
    // observe the intermediate CREATED state.
    const queued = await this.store.create(envelope, MessageStatus.QUEUED);
    this.emitCreated(queued);
    this.emitQueued(queued);

    this.inFlightCount += 1;
    this.metrics?.setQueueDepth(this.inFlightCount);
    try {
      return await this.dispatcher.dispatch(queued);
    } finally {
      this.inFlightCount = Math.max(0, this.inFlightCount - 1);
      this.metrics?.setQueueDepth(this.inFlightCount);
    }
  }

  subscribe(receiverAgentId: string, callback: MessageSubscriberCallback): string {
    return this.router.subscribe(receiverAgentId, callback);
  }

  unsubscribe(receiverAgentId: string, subscriberId: string): void {
    this.router.unsubscribe(receiverAgentId, subscriberId);
  }

  async dispatch(messageId: string): Promise<AgentMessage> {
    const message = await this.mustFind(messageId);
    return this.dispatcher.dispatch(message);
  }

  async retry(messageId: string): Promise<AgentMessage> {
    await this.mustFind(messageId);
    const queued = await this.store.updateStatus(messageId, MessageStatus.QUEUED, { lastError: null });
    return this.dispatcher.dispatch(queued);
  }

  async deadLetter(messageId: string, reason: string): Promise<AgentMessage> {
    await this.mustFind(messageId);
    const deadLettered = await this.store.updateStatus(messageId, MessageStatus.DEAD_LETTER, { lastError: reason });
    this.metrics?.recordMessageOutcome({ status: MessageStatus.DEAD_LETTER });
    return deadLettered;
  }

  async replay(messageId: string): Promise<AgentMessage> {
    await this.mustFind(messageId);
    const requeued = await this.store.updateStatus(messageId, MessageStatus.QUEUED, {
      retryCount: 0,
      lastError: null,
    });
    return this.dispatcher.dispatch(requeued);
  }

  async lookup(messageId: string): Promise<AgentMessage | null> {
    return this.store.findById(messageId);
  }

  private async mustFind(messageId: string): Promise<AgentMessage> {
    const message = await this.store.findById(messageId);
    if (!message) {
      throw new MessageBusError(
        MessageBusErrorCode.MESSAGE_NOT_FOUND,
        `Agent message not found: ${messageId}`,
        messageId,
      );
    }
    return message;
  }

  private emitCreated(message: AgentMessage): void {
    this.structuredLogger?.log({
      operation: 'MESSAGE_CREATED',
      status: 'SUCCESS',
      latencyMs: 0,
      aggregateId: message.messageId,
    });
    this.metrics?.recordMessageOutcome({ status: MessageStatus.CREATED });
    this.auditLog
      ?.recordSecurityEvent({
        traceId: message.traceId,
        userId: null,
        operation: 'MESSAGE_CREATED',
        resource: `AgentMessage:${message.messageId}`,
        after: {
          senderAgentId: message.senderAgentId,
          receiverAgentId: message.receiverAgentId,
          messageType: message.messageType,
        },
      })
      .catch(() => undefined);
  }

  private emitQueued(message: AgentMessage): void {
    this.structuredLogger?.log({
      operation: 'MESSAGE_QUEUED',
      status: 'SUCCESS',
      latencyMs: 0,
      aggregateId: message.messageId,
    });
    this.metrics?.recordMessageOutcome({ status: MessageStatus.QUEUED });
  }
}
