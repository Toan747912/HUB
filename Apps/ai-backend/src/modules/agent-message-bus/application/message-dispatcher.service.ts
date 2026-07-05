import { Injectable } from '@nestjs/common';
import { AuditLogService } from '../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../infrastructure/observability/structured-logger.service';
import { AgentMessage } from '../domain/agent-message';
import { MessageStatus } from '../domain/message-status';
import { AgentRuntimeMessageHandler } from './agent-runtime-message-handler.service';
import { MessageRouterService } from './message-router.service';
import { MessageStoreService } from './message-store.service';

const MAX_RETRIES = 3;

/**
 * Takes a queued AgentMessage and delivers it: resolves the receiver through
 * MessageRouterService, then - for handler-routed types - calls
 * AgentRuntimeService via AgentRuntimeMessageHandler, or - for EVENT/
 * NOTIFICATION - fans out to subscriber callbacks. Never lets a delivery
 * exception escape: transient failures retry up to MAX_RETRIES before moving
 * to DEAD_LETTER, and every transition is persisted and observed.
 */
@Injectable()
export class MessageDispatcherService {
  constructor(
    private readonly router: MessageRouterService,
    private readonly store: MessageStoreService,
    private readonly handler: AgentRuntimeMessageHandler,
    private readonly structuredLogger?: StructuredLoggerService,
    private readonly metrics?: MetricsService,
    private readonly auditLog?: AuditLogService,
  ) {}

  async dispatch(message: AgentMessage): Promise<AgentMessage> {
    let current = await this.store.updateStatus(message.messageId, MessageStatus.DELIVERING);

    const routing = this.router.resolve(current.receiverAgentId, current.messageType);
    if (!routing.ok) {
      current = await this.store.updateStatus(current.messageId, MessageStatus.FAILED, {
        lastError: `${routing.reason}: ${current.receiverAgentId}`,
      });
      this.emit('MESSAGE_FAILED', current);
      return current;
    }

    const startedAt = Date.now();
    try {
      const responsePayload = await this.deliver(current, routing.kind);
      current = await this.store.updateStatus(current.messageId, MessageStatus.DELIVERED, {
        metadata: { ...current.metadata, response: responsePayload ?? null },
      });
      this.emit('MESSAGE_DELIVERED', current, Date.now() - startedAt);
      return current;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.handleFailure(current, errorMessage);
    }
  }

  private async deliver(
    message: AgentMessage,
    kind: 'handler' | 'subscribers',
  ): Promise<Record<string, unknown> | null> {
    if (kind === 'subscribers') {
      const subscribers = this.router.getSubscribers(message.receiverAgentId);
      await Promise.all(subscribers.map((subscriber) => subscriber.callback(message)));
      return null;
    }

    const result = await this.handler.handle(message);
    if (result.status === 'FAILED') {
      throw new Error(result.error ?? `Delivery to "${message.receiverAgentId}" failed`);
    }
    return result.responsePayload ?? null;
  }

  private async handleFailure(message: AgentMessage, errorMessage: string): Promise<AgentMessage> {
    const retryCount = message.retryCount + 1;

    if (retryCount > MAX_RETRIES) {
      const deadLettered = await this.store.updateStatus(message.messageId, MessageStatus.DEAD_LETTER, {
        retryCount,
        lastError: errorMessage,
      });
      this.emit('MESSAGE_DEAD_LETTER', deadLettered);
      return deadLettered;
    }

    const retrying = await this.store.updateStatus(message.messageId, MessageStatus.RETRYING, {
      retryCount,
      lastError: errorMessage,
    });
    this.emit('MESSAGE_RETRIED', retrying);
    return this.dispatch(retrying);
  }

  private emit(
    operation: 'MESSAGE_FAILED' | 'MESSAGE_DELIVERED' | 'MESSAGE_RETRIED' | 'MESSAGE_DEAD_LETTER',
    message: AgentMessage,
    latencyMs = 0,
  ): void {
    const status: 'SUCCESS' | 'FAILURE' = operation === 'MESSAGE_DELIVERED' ? 'SUCCESS' : 'FAILURE';

    this.structuredLogger?.log({
      operation,
      status,
      latencyMs,
      aggregateId: message.messageId,
      errorCode: message.lastError ?? undefined,
    });
    this.metrics?.recordMessageOutcome({ status: message.status, latencyMs });

    if (operation === 'MESSAGE_DEAD_LETTER') {
      this.auditLog
        ?.recordSecurityEvent({
          traceId: message.traceId,
          userId: null,
          operation,
          resource: `AgentMessage:${message.messageId}`,
          after: { error: message.lastError },
        })
        .catch(() => undefined);
    }
  }
}
