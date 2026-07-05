import { IMessageRepository } from '../../domain/message-types';
import { MessageRetentionService } from '../message-retention.service';

describe('MessageRetentionService', () => {
  let repository: jest.Mocked<IMessageRepository>;
  let service: MessageRetentionService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findByStatus: jest.fn(),
      findByTraceId: jest.fn(),
      deleteTerminalOlderThan: jest.fn(),
    };
    service = new MessageRetentionService(repository);
  });

  it('purges terminal messages older than the retention window', async () => {
    repository.deleteTerminalOlderThan.mockResolvedValue(5);
    const now = new Date('2026-07-04T00:00:00.000Z');

    const result = await service.purgeTerminal(now);

    expect(result).toEqual({ deletedCount: 5 });
    const cutoff = repository.deleteTerminalOlderThan.mock.calls[0][0] as Date;
    expect(cutoff.getTime()).toBe(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  });

  it('sweep() never throws even if the repository rejects', async () => {
    repository.deleteTerminalOlderThan.mockRejectedValue(new Error('mongo down'));

    await expect(service.sweep()).resolves.toBeUndefined();
  });
});
