import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { AgentMessage } from '../domain/agent-message';
import { MessageEnvelope } from '../domain/message-envelope';
import { MessagePriority } from '../domain/message-priority';
import { MessageStatus } from '../domain/message-status';
import { IMessageRepository, MESSAGE_REPOSITORY } from '../domain/message-types';

/**
 * Thin persistence-facing wrapper over IMessageRepository (Mongo-backed in
 * production). Owns nothing about routing or delivery - only creates the
 * initial AgentMessage record and applies status/field patches on request.
 */
@Injectable()
export class MessageStoreService {
  constructor(
    @Inject(MESSAGE_REPOSITORY) private readonly repository: IMessageRepository,
    private readonly metrics?: MetricsService,
  ) {}

  async create(envelope: MessageEnvelope, initialStatus: MessageStatus = MessageStatus.CREATED): Promise<AgentMessage> {
    const now = new Date();
    const message: AgentMessage = {
      messageId: randomUUID(),
      traceId: envelope.traceId,
      workflowId: envelope.workflowId ?? null,
      senderAgentId: envelope.senderAgentId,
      receiverAgentId: envelope.receiverAgentId,
      messageType: envelope.messageType,
      priority: envelope.priority ?? MessagePriority.NORMAL,
      payload: envelope.payload,
      metadata: envelope.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      status: initialStatus,
      retryCount: 0,
      lastError: null,
    };
    return this.instrumented('create', () => this.repository.create(message));
  }

  async updateStatus(
    messageId: string,
    status: MessageStatus,
    patch: Partial<AgentMessage> = {},
  ): Promise<AgentMessage> {
    return this.instrumented('update', () =>
      this.repository.update(messageId, { ...patch, status, updatedAt: new Date() }),
    );
  }

  async findById(messageId: string): Promise<AgentMessage | null> {
    return this.instrumented('findById', () => this.repository.findById(messageId));
  }

  async findByStatus(statuses: MessageStatus[]): Promise<AgentMessage[]> {
    return this.instrumented('findByStatus', () => this.repository.findByStatus(statuses));
  }

  async findByTraceId(traceId: string): Promise<AgentMessage[]> {
    return this.instrumented('findByTraceId', () => this.repository.findByTraceId(traceId));
  }

  private async instrumented<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      this.metrics?.recordDbLatency(`agent_message_bus.${operation}`, Date.now() - start);
    }
  }
}
