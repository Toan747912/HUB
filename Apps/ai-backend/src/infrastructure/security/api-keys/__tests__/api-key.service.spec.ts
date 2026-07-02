import { createHash } from 'crypto';
import { ApiKeyRepository } from '../api-key.repository';
import { ApiKeyService } from '../api-key.service';

describe('ApiKeyService', () => {
  let repository: jest.Mocked<Pick<ApiKeyRepository, 'findActiveByHash' | 'create' | 'revoke'>>;
  let service: ApiKeyService;

  beforeEach(() => {
    repository = {
      findActiveByHash: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined)
    };
    service = new ApiKeyService(repository as unknown as ApiKeyRepository);
  });

  // Evidence: API key
  it('issues a raw key and stores only its SHA-256 hash', async () => {
    repository.create.mockResolvedValue({ _id: 'key-1', keyHash: 'x', label: 'ci', createdAt: new Date(), revokedAt: null });

    const rawKey = await service.issue('ci');

    expect(rawKey).toHaveLength(64); // 32 bytes hex-encoded
    const expectedHash = createHash('sha256').update(rawKey).digest('hex');
    expect(repository.create).toHaveBeenCalledWith(expectedHash, 'ci');
  });

  it('verify() returns true for a key with an active matching hash', async () => {
    repository.findActiveByHash.mockResolvedValue({ _id: 'key-1', keyHash: 'x', label: 'ci', createdAt: new Date(), revokedAt: null });
    expect(await service.verify('any-raw-key')).toBe(true);
  });

  it('verify() returns false for an unknown key', async () => {
    repository.findActiveByHash.mockResolvedValue(null);
    expect(await service.verify('unknown-key')).toBe(false);
  });

  it('verify() returns false for a revoked key (not returned by findActiveByHash)', async () => {
    repository.findActiveByHash.mockResolvedValue(null);
    expect(await service.verify('revoked-key')).toBe(false);
  });
});
