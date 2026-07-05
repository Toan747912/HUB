import { IMessageRepository } from '../../domain/message-types';
import { MessagePriority } from '../../domain/message-priority';
import { MessageStatus } from '../../domain/message-status';
import { MessageType } from '../../domain/message-types';
import { MessageStoreService } from '../message-store.service';

describe('MessageStoreService', () => {
  let repository: jest.Mocked<IMessageRepository>;
  let service: MessageStoreService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByStatus: jest.fn(),
      findByTraceId: jest.fn(),
      deleteTerminalOlderThan: jest.fn(),
    };
    service = new MessageStoreService(repository);
  });

  it('generates a CREATED message with a fresh id and persists it', async () => {
    repository.create.mockImplementation(async (message) => message);

    const created = await service.create({
      traceId: 'trace-1',
      senderAgentId: 'coordinator',
      receiverAgentId: 'agent-a',
      messageType: MessageType.REQUEST,
      payload: { goal: 'summarize' },
    });

    expect(created.status).toBe(MessageStatus.CREATED);
    expect(created.retryCount).toBe(0);
    expect(created.priority).toBe(MessagePriority.NORMAL);
    expect(created.messageId).toEqual(expect.any(String));
    expect(repository.create).toHaveBeenCalledWith(created);
  });

  it('applies a status patch through updateStatus', async () => {
    repository.update.mockImplementation(async (id, patch) => ({ messageId: id, ...patch }) as any);

    const updated = await service.updateStatus('msg-1', MessageStatus.QUEUED);

    expect(repository.update).toHaveBeenCalledWith('msg-1', expect.objectContaining({ status: MessageStatus.QUEUED }));
    expect(updated.status).toBe(MessageStatus.QUEUED);
  });

  it('delegates findById/findByStatus/findByTraceId to the repository', async () => {
    repository.findById.mockResolvedValue(null);
    repository.findByStatus.mockResolvedValue([]);
    repository.findByTraceId.mockResolvedValue([]);

    await expect(service.findById('missing')).resolves.toBeNull();
    await expect(service.findByStatus([MessageStatus.QUEUED])).resolves.toEqual([]);
    await expect(service.findByTraceId('trace-1')).resolves.toEqual([]);
  });

  it('works without the optional metrics collaborator', async () => {
    repository.create.mockImplementation(async (message) => message);
    const bareService = new MessageStoreService(repository);

    await expect(
      bareService.create({
        traceId: 'trace-1',
        senderAgentId: 'coordinator',
        receiverAgentId: 'agent-a',
        messageType: MessageType.EVENT,
        payload: {},
      }),
    ).resolves.toEqual(expect.objectContaining({ status: MessageStatus.CREATED }));
  });
});
