import { createHash } from 'crypto';
import { AuditLogService } from '../../../audit/audit-log.service';
import { ApiKeyRepository } from '../api-key.repository';
import { ApiKeyService } from '../api-key.service';

describe('ApiKeyService', () => {
  let repository: jest.Mocked<Pick<ApiKeyRepository, 'findActiveByHash' | 'create' | 'revoke'>>;
  let auditLog: jest.Mocked<Pick<AuditLogService, 'recordSecurityEvent'>>;
  let service: ApiKeyService;

  beforeEach(() => {
    repository = {
      findActiveByHash: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
    };
    auditLog = { recordSecurityEvent: jest.fn().mockResolvedValue(undefined) };
    service = new ApiKeyService(
      repository as unknown as ApiKeyRepository,
      auditLog as unknown as AuditLogService,
    );
  });

  // Evidence: API key
  it('issues a raw key and stores only its SHA-256 hash', async () => {
    repository.create.mockResolvedValue({
      _id: 'key-1',
      keyHash: 'x',
      label: 'ci',
      createdAt: new Date(),
      revokedAt: null,
      permissions: [],
    });

    const rawKey = await service.issue('ci');

    expect(rawKey).toHaveLength(64); // 32 bytes hex-encoded
    const expectedHash = createHash('sha256').update(rawKey).digest('hex');
    expect(repository.create).toHaveBeenCalledWith(expectedHash, 'ci', []);
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'API_KEY_ISSUED' }),
    );
  });

  // Evidence: least-privilege API keys
  it('issues a key scoped to explicitly requested permissions', async () => {
    repository.create.mockResolvedValue({
      _id: 'key-2',
      keyHash: 'x',
      label: 'integration',
      createdAt: new Date(),
      revokedAt: null,
      permissions: ['Goal.Read'],
    });

    await service.issue('integration', ['Goal.Read']);

    expect(repository.create).toHaveBeenCalledWith(expect.any(String), 'integration', [
      'Goal.Read',
    ]);
  });

  it('verify() returns the matching document for a key with an active matching hash', async () => {
    const doc = {
      _id: 'key-1',
      keyHash: 'x',
      label: 'ci',
      createdAt: new Date(),
      revokedAt: null,
      permissions: [],
    };
    repository.findActiveByHash.mockResolvedValue(doc);
    expect(await service.verify('any-raw-key')).toEqual(doc);
  });

  it('verify() returns null for an unknown key', async () => {
    repository.findActiveByHash.mockResolvedValue(null);
    expect(await service.verify('unknown-key')).toBeNull();
  });

  it('verify() returns null for a revoked key (not returned by findActiveByHash)', async () => {
    repository.findActiveByHash.mockResolvedValue(null);
    expect(await service.verify('revoked-key')).toBeNull();
  });

  it('revoke() audits an API_KEY_REVOKED event', async () => {
    await service.revoke('key-1');
    expect(repository.revoke).toHaveBeenCalledWith('key-1');
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'API_KEY_REVOKED' }),
    );
  });
});
