import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../infrastructure/persistence/prisma.service';
import { AgentMessage } from '../../domain/agent-message';
import { MessagePriority } from '../../domain/message-priority';
import { MessageStatus } from '../../domain/message-status';
import { MessageType } from '../../domain/message-types';
import { PrismaMessageRepository } from '../prisma-message.repository';

function buildMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  const now = new Date();
  return {
    messageId: randomUUID(),
    traceId: 'trace-1',
    workflowId: 'plan-1',
    senderAgentId: 'coordinator',
    receiverAgentId: 'agent-a',
    messageType: MessageType.REQUEST,
    priority: MessagePriority.NORMAL,
    payload: { goal: 'summarize' },
    metadata: {},
    createdAt: now,
    updatedAt: now,
    status: MessageStatus.CREATED,
    retryCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('PrismaMessageRepository — integration', () => {
  let prisma: PrismaService;
  let repository: PrismaMessageRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaMessageRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.agentMessage.deleteMany({});
  });

  it('creates a record and reads it back by id', async () => {
    const created = buildMessage();
    await repository.create(created);

    const found = await repository.findById(created.messageId);
    expect(found).toMatchObject({
      messageId: created.messageId,
      senderAgentId: 'coordinator',
      receiverAgentId: 'agent-a',
      status: MessageStatus.CREATED,
    });
  });

  it('returns null for an unknown message id', async () => {
    const found = await repository.findById('missing-message');
    expect(found).toBeNull();
  });

  it('updates fields in place and returns the merged document', async () => {
    const created = buildMessage();
    await repository.create(created);

    const updated = await repository.update(created.messageId, {
      status: MessageStatus.DELIVERED,
      metadata: { response: { output: 'ok' } },
      retryCount: 1,
    });

    expect(updated.status).toBe(MessageStatus.DELIVERED);
    expect(updated.metadata).toEqual({ response: { output: 'ok' } });
    expect(updated.retryCount).toBe(1);

    const count = await prisma.agentMessage.count({ where: { id: created.messageId } });
    expect(count).toBe(1);
  });

  it('throws when updating a message that does not exist', async () => {
    await expect(repository.update('missing-message', { status: MessageStatus.FAILED })).rejects.toThrow(
      'Agent message not found: missing-message',
    );
  });

  it('findByStatus filters to only the requested statuses', async () => {
    await repository.create(buildMessage({ status: MessageStatus.QUEUED }));
    await repository.create(buildMessage({ status: MessageStatus.DELIVERING }));
    await repository.create(buildMessage({ status: MessageStatus.DELIVERED }));
    await repository.create(buildMessage({ status: MessageStatus.DEAD_LETTER }));

    const inFlight = await repository.findByStatus([MessageStatus.QUEUED, MessageStatus.DELIVERING]);
    expect(inFlight.map((m) => m.status).sort()).toEqual([MessageStatus.DELIVERING, MessageStatus.QUEUED].sort());
  });

  it('findByTraceId returns every message for a trace', async () => {
    await repository.create(buildMessage({ traceId: 'trace-a' }));
    await repository.create(buildMessage({ traceId: 'trace-a' }));
    await repository.create(buildMessage({ traceId: 'trace-b' }));

    const messages = await repository.findByTraceId('trace-a');
    expect(messages).toHaveLength(2);
  });

  it('throws when the underlying Prisma client throws (connection failure handling)', async () => {
    const faultyPrisma = {
      agentMessage: {
        create: () => Promise.reject(new Error('DB_FAULT')),
        update: () => Promise.reject(new Error('DB_FAULT')),
        findUnique: () => Promise.reject(new Error('DB_FAULT')),
        findMany: () => Promise.reject(new Error('DB_FAULT')),
        deleteMany: () => Promise.reject(new Error('DB_FAULT')),
      },
    } as unknown as PrismaService;

    const faultyRepo = new PrismaMessageRepository(faultyPrisma);
    const message = buildMessage();

    await expect(faultyRepo.create(message)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findById(message.messageId)).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findByStatus([MessageStatus.QUEUED])).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.findByTraceId('trace-x')).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.deleteTerminalOlderThan(new Date())).rejects.toThrow('DB_FAULT');
  });
});
