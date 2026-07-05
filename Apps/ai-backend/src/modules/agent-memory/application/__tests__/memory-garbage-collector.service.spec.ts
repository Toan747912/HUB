import { IMemoryRepository } from '../../domain/memory.types';
import { MemoryGarbageCollectorService } from '../memory-garbage-collector.service';

describe('MemoryGarbageCollectorService', () => {
  let repository: jest.Mocked<IMemoryRepository>;
  let service: MemoryGarbageCollectorService;

  beforeEach(() => {
    repository = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      queryByTag: jest.fn(),
      queryByScope: jest.fn(),
      deleteExpired: jest.fn(),
    };
    service = new MemoryGarbageCollectorService(repository);
  });

  it('delegates to repository.deleteExpired and reports the deleted count', async () => {
    repository.deleteExpired.mockResolvedValue(3);

    const result = await service.cleanupExpired();

    expect(result).toEqual({ deletedCount: 3 });
    expect(repository.deleteExpired).toHaveBeenCalledWith(expect.any(Date));
  });

  it('passes through an explicit "now" when provided', async () => {
    repository.deleteExpired.mockResolvedValue(0);
    const now = new Date('2026-01-01T00:00:00.000Z');

    await service.cleanupExpired(now);

    expect(repository.deleteExpired).toHaveBeenCalledWith(now);
  });

  it('propagates errors from the repository', async () => {
    repository.deleteExpired.mockRejectedValue(new Error('mongo down'));

    await expect(service.cleanupExpired()).rejects.toThrow('mongo down');
  });

  it('sweep() invokes cleanupExpired on the scheduled interval', async () => {
    repository.deleteExpired.mockResolvedValue(2);

    await service.sweep();

    expect(repository.deleteExpired).toHaveBeenCalledWith(expect.any(Date));
  });

  it('sweep() never throws even if cleanupExpired rejects', async () => {
    repository.deleteExpired.mockRejectedValue(new Error('mongo down'));

    await expect(service.sweep()).resolves.toBeUndefined();
  });
});
