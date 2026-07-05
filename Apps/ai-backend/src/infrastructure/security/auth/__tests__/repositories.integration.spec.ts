import { PrismaService } from '../../../persistence/prisma.service';
import { ApiKeyRepository } from '../../api-keys/api-key.repository';
import { RefreshTokenRepository } from '../refresh-token.repository';
import { UserRepository } from '../user.repository';

describe('Security repositories — integration', () => {
  let prisma: PrismaService;
  let userRepo: UserRepository;
  let refreshRepo: RefreshTokenRepository;
  let apiKeyRepo: ApiKeyRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    userRepo = new UserRepository(prisma);
    refreshRepo = new RefreshTokenRepository(prisma);
    apiKeyRepo = new ApiKeyRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.apiKey.deleteMany({});
  });

  describe('UserRepository', () => {
    it('creates and finds a user by username', async () => {
      await userRepo.create('alice', 'hashed', ['STUDENT']);
      const found = await userRepo.findByUsername('alice');
      expect(found).not.toBeNull();
      expect(found!.roles).toEqual(['STUDENT']);
    });

    it('findByUsername returns null for an unknown user', async () => {
      expect(await userRepo.findByUsername('nobody')).toBeNull();
    });

    // Evidence: role changes
    it('updateRoles changes a user role, and audit-worthy state is queryable afterward', async () => {
      const user = await userRepo.create('bob', 'hashed', ['STUDENT']);
      await userRepo.updateRoles(user._id, ['TEACHER']);
      const updated = await userRepo.findById(user._id);
      expect(updated!.roles).toEqual(['TEACHER']);
    });
  });

  describe('RefreshTokenRepository', () => {
    it('save + findById round-trips a token record', async () => {
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + 60_000);
      await refreshRepo.save({
        jti: 'jti-1',
        userId: 'user-1',
        familyId: 'fam-1',
        issuedAt,
        expiresAt,
      });

      const found = await refreshRepo.findById('jti-1');
      expect(found).not.toBeNull();
      expect(found!.familyId).toBe('fam-1');
      expect(await refreshRepo.isActive('jti-1')).toBe(true);
    });

    it('markConsumed prevents isActive from being true', async () => {
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + 60_000);
      await refreshRepo.save({
        jti: 'jti-2',
        userId: 'user-1',
        familyId: 'fam-2',
        issuedAt,
        expiresAt,
      });
      await refreshRepo.markConsumed('jti-2', 'jti-3');

      expect(await refreshRepo.isActive('jti-2')).toBe(false);
    });

    it('revokeFamily revokes every token sharing the familyId', async () => {
      const issuedAt = new Date();
      const expiresAt = new Date(issuedAt.getTime() + 60_000);
      await refreshRepo.save({
        jti: 'jti-a',
        userId: 'user-1',
        familyId: 'fam-x',
        issuedAt,
        expiresAt,
      });
      await refreshRepo.save({
        jti: 'jti-b',
        userId: 'user-1',
        familyId: 'fam-x',
        issuedAt,
        expiresAt,
      });

      await refreshRepo.revokeFamily('fam-x');

      expect(await refreshRepo.isActive('jti-a')).toBe(false);
      expect(await refreshRepo.isActive('jti-b')).toBe(false);
    });

    it('isActive is false for an expired token', async () => {
      const issuedAt = new Date(Date.now() - 120_000);
      const expiresAt = new Date(Date.now() - 60_000);
      await refreshRepo.save({
        jti: 'jti-expired',
        userId: 'user-1',
        familyId: 'fam-e',
        issuedAt,
        expiresAt,
      });

      expect(await refreshRepo.isActive('jti-expired')).toBe(false);
    });
  });

  describe('ApiKeyRepository', () => {
    it('create + findActiveByHash round-trips', async () => {
      await apiKeyRepo.create('hash-1', 'ci-key');
      const found = await apiKeyRepo.findActiveByHash('hash-1');
      expect(found).not.toBeNull();
      expect(found!.label).toBe('ci-key');
    });

    it('revoke() makes the key no longer findable as active', async () => {
      const created = await apiKeyRepo.create('hash-2', 'to-revoke');
      await apiKeyRepo.revoke(created._id);
      expect(await apiKeyRepo.findActiveByHash('hash-2')).toBeNull();
    });
  });
});
