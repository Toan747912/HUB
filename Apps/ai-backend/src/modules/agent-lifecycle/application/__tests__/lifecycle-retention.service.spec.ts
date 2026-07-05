import { ILifecycleRepository } from '../../domain/lifecycle.types';
import { LifecycleRetentionService } from '../lifecycle-retention.service';

describe('LifecycleRetentionService', () => {
  let repository: jest.Mocked<ILifecycleRepository>;
  let service: LifecycleRetentionService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findActive: jest.fn(),
      deleteTerminalOlderThan: jest.fn(),
    };
    service = new LifecycleRetentionService(repository);
  });

  it('purges terminal instances older than the retention window', async () => {
    repository.deleteTerminalOlderThan.mockResolvedValue(4);
    const now = new Date('2026-07-04T00:00:00.000Z');

    const result = await service.purgeTerminal(now);

    expect(result).toEqual({ deletedCount: 4 });
    const cutoff = repository.deleteTerminalOlderThan.mock.calls[0][0] as Date;
    expect(cutoff.getTime()).toBe(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  });

  it('sweep() never throws even if the repository rejects', async () => {
    repository.deleteTerminalOlderThan.mockRejectedValue(new Error('mongo down'));

    await expect(service.sweep()).resolves.toBeUndefined();
  });
});
