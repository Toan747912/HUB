import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, disconnect } from 'mongoose';
import { ApiKeyDocument, ApiKeySchema } from '../../api-keys/api-key.schema';
import { ApiKeyRepository } from '../../api-keys/api-key.repository';
import { RefreshTokenDocument, RefreshTokenSchema } from '../refresh-token.schema';
import { RefreshTokenRepository } from '../refresh-token.repository';
import { UserDocument, UserSchema } from '../user.schema';
import { UserRepository } from '../user.repository';

jest.setTimeout(300_000);

describe('Security repositories — integration', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let userRepo: UserRepository;
  let refreshRepo: RefreshTokenRepository;
  let apiKeyRepo: ApiKeyRepository;
  let userModel: Model<UserDocument>;
  let refreshModel: Model<RefreshTokenDocument>;
  let apiKeyModel: Model<ApiKeyDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri(), { dbName: 'test-db' }),
        MongooseModule.forFeature([
          { name: 'User', schema: UserSchema },
          { name: 'RefreshToken', schema: RefreshTokenSchema },
          { name: 'ApiKey', schema: ApiKeySchema },
        ]),
      ],
      providers: [
        {
          provide: UserRepository,
          useFactory: (m: Model<UserDocument>) => new UserRepository(m),
          inject: [getModelToken('User')],
        },
        {
          provide: RefreshTokenRepository,
          useFactory: (m: Model<RefreshTokenDocument>) => new RefreshTokenRepository(m),
          inject: [getModelToken('RefreshToken')],
        },
        {
          provide: ApiKeyRepository,
          useFactory: (m: Model<ApiKeyDocument>) => new ApiKeyRepository(m),
          inject: [getModelToken('ApiKey')],
        },
      ],
    }).compile();

    userRepo = module.get(UserRepository);
    refreshRepo = module.get(RefreshTokenRepository);
    apiKeyRepo = module.get(ApiKeyRepository);
    userModel = module.get(getModelToken('User'));
    refreshModel = module.get(getModelToken('RefreshToken'));
    apiKeyModel = module.get(getModelToken('ApiKey'));
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    await refreshModel.deleteMany({});
    await apiKeyModel.deleteMany({});
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
