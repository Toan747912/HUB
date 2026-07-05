import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/persistence/prisma.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { AgentMessage } from '../domain/agent-message';
import { MessageStatus } from '../domain/message-status';
import { IMessageRepository } from '../domain/message-types';
import { AgentMessageDocument } from '../schemas/agent-message.schema';

@Injectable()
export class PrismaMessageRepository implements IMessageRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics?: MetricsService,
  ) {}

  async create(message: AgentMessage): Promise<AgentMessage> {
    return this.instrumented('create', async () => {
      const created = await this.prisma.agentMessage.create({
        data: {
          id: message.messageId,
          traceId: message.traceId,
          workflowId: message.workflowId,
          senderAgentId: message.senderAgentId,
          receiverAgentId: message.receiverAgentId,
          messageType: message.messageType,
          priority: message.priority,
          payload: message.payload as unknown as Prisma.InputJsonValue,
          metadata: message.metadata as unknown as Prisma.InputJsonValue,
          status: message.status,
          retryCount: message.retryCount,
          lastError: message.lastError,
        },
      });
      return this.toDomain(this.toDocument(created));
    });
  }

  async update(messageId: string, patch: Partial<AgentMessage>): Promise<AgentMessage> {
    return this.instrumented('update', async () => {
      const { messageId: _ignored, createdAt: _createdAtIgnored, ...fields } = patch as AgentMessage;
      try {
        const updated = await this.prisma.agentMessage.update({
          where: { id: messageId },
          data: {
            ...fields,
            payload: fields.payload as unknown as Prisma.InputJsonValue | undefined,
            metadata: fields.metadata as unknown as Prisma.InputJsonValue | undefined,
          },
        });
        return this.toDomain(this.toDocument(updated));
      } catch {
        throw new Error(`Agent message not found: ${messageId}`);
      }
    });
  }

  async findById(messageId: string): Promise<AgentMessage | null> {
    return this.instrumented('findById', async () => {
      const row = await this.prisma.agentMessage.findUnique({ where: { id: messageId } });
      return row ? this.toDomain(this.toDocument(row)) : null;
    });
  }

  async findByStatus(statuses: MessageStatus[]): Promise<AgentMessage[]> {
    return this.instrumented('findByStatus', async () => {
      const rows = await this.prisma.agentMessage.findMany({ where: { status: { in: statuses } } });
      return rows.map((row) => this.toDomain(this.toDocument(row)));
    });
  }

  async findByTraceId(traceId: string): Promise<AgentMessage[]> {
    return this.instrumented('findByTraceId', async () => {
      const rows = await this.prisma.agentMessage.findMany({ where: { traceId } });
      return rows.map((row) => this.toDomain(this.toDocument(row)));
    });
  }

  async deleteTerminalOlderThan(cutoff: Date): Promise<number> {
    return this.instrumented('deleteTerminalOlderThan', async () => {
      const result = await this.prisma.agentMessage.deleteMany({
        where: {
          status: { in: [MessageStatus.DELIVERED, MessageStatus.DEAD_LETTER] },
          updatedAt: { lt: cutoff },
        },
      });
      return result.count;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): AgentMessageDocument {
    return {
      _id: row.id,
      traceId: row.traceId,
      workflowId: row.workflowId,
      senderAgentId: row.senderAgentId,
      receiverAgentId: row.receiverAgentId,
      messageType: row.messageType,
      priority: row.priority,
      payload: row.payload,
      metadata: row.metadata,
      status: row.status,
      retryCount: row.retryCount,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDomain(doc: AgentMessageDocument): AgentMessage {
    return {
      messageId: doc._id,
      traceId: doc.traceId,
      workflowId: doc.workflowId ?? null,
      senderAgentId: doc.senderAgentId,
      receiverAgentId: doc.receiverAgentId,
      messageType: doc.messageType,
      priority: doc.priority,
      payload: doc.payload ?? {},
      metadata: doc.metadata ?? {},
      status: doc.status,
      retryCount: doc.retryCount,
      lastError: doc.lastError ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
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
