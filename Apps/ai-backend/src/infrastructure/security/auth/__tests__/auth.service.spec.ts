import { UnauthorizedException } from '@nestjs/common';
import { AuditLogService } from '../../../audit/audit-log.service';
import { AuthService } from '../auth.service';
import { BruteForceService } from '../brute-force.service';
import { AppJwtService } from '../jwt.service';
import { PasswordService } from '../password.service';
import { RefreshTokenRepository } from '../refresh-token.repository';
import { UserRepository } from '../user.repository';

describe('AuthService', () => {
  const OLD_ENV = process.env;

  let users: jest.Mocked<Pick<UserRepository, 'findByUsername' | 'findById' | 'create'>>;
  let passwords: PasswordService;
  let jwt: AppJwtService;
  let refreshTokens: jest.Mocked<
    Pick<RefreshTokenRepository, 'save' | 'findById' | 'markConsumed' | 'revoke' | 'revokeFamily'>
  >;
  let bruteForce: jest.Mocked<Pick<BruteForceService, 'isLocked' | 'recordFailure' | 'reset'>>;
  let auditLog: jest.Mocked<Pick<AuditLogService, 'recordSecurityEvent'>>;
  let auth: AuthService;

  const storedTokens = new Map<string, any>();

  beforeEach(async () => {
    process.env = { ...OLD_ENV, JWT_SECRET: 'access-secret', REFRESH_SECRET: 'refresh-secret' };
    storedTokens.clear();

    passwords = new PasswordService();
    const passwordHash = await passwords.hash('Str0ng!Passw0rd');

    users = {
      findByUsername: jest
        .fn()
        .mockResolvedValue({ _id: 'user-1', username: 'alice', passwordHash, roles: ['STUDENT'] }),
      findById: jest
        .fn()
        .mockResolvedValue({ _id: 'user-1', username: 'alice', passwordHash, roles: ['STUDENT'] }),
      create: jest.fn(),
    };

    jwt = new AppJwtService();

    refreshTokens = {
      save: jest.fn().mockImplementation(async (input) => {
        storedTokens.set(input.jti, {
          ...input,
          consumedAt: null,
          revokedAt: null,
          replacedByTokenId: null,
        });
      }),
      findById: jest.fn().mockImplementation(async (jti) => storedTokens.get(jti) ?? null),
      markConsumed: jest.fn().mockImplementation(async (jti, replacedByTokenId) => {
        const doc = storedTokens.get(jti);
        if (doc) {
          doc.consumedAt = new Date();
          doc.replacedByTokenId = replacedByTokenId;
        }
      }),
      revoke: jest.fn(),
      revokeFamily: jest.fn().mockImplementation(async (familyId) => {
        for (const doc of storedTokens.values()) {
          if (doc.familyId === familyId) doc.revokedAt = new Date();
        }
      }),
    };

    bruteForce = {
      isLocked: jest.fn().mockResolvedValue(false),
      recordFailure: jest.fn(),
      reset: jest.fn(),
    };
    auditLog = { recordSecurityEvent: jest.fn().mockResolvedValue(undefined) };

    auth = new AuthService(
      users as unknown as UserRepository,
      passwords,
      jwt,
      refreshTokens as unknown as RefreshTokenRepository,
      bruteForce as unknown as BruteForceService,
      auditLog as unknown as AuditLogService,
    );
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('login() succeeds with correct credentials and issues a token pair', async () => {
    const pair = await auth.login('alice', 'Str0ng!Passw0rd');
    expect(pair.accessToken.split('.')).toHaveLength(3);
    expect(pair.refreshToken.split('.')).toHaveLength(3);
    expect(bruteForce.reset).toHaveBeenCalledWith('alice');
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'LOGIN_SUCCESS' }),
    );
  });

  it('login() fails with wrong password and records a brute-force failure', async () => {
    await expect(auth.login('alice', 'WrongPassword1!')).rejects.toThrow(UnauthorizedException);
    expect(bruteForce.recordFailure).toHaveBeenCalledWith('alice');
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'LOGIN_FAILED',
        after: { reason: 'INVALID_CREDENTIALS' },
      }),
    );
  });

  it('login() is rejected pre-emptively when the account is locked', async () => {
    bruteForce.isLocked.mockResolvedValue(true);
    await expect(auth.login('alice', 'Str0ng!Passw0rd')).rejects.toThrow(UnauthorizedException);
    expect(users.findByUsername).not.toHaveBeenCalled();
  });

  // Evidence: Refresh rotation
  it('refresh() consumes the old token and issues a new one in the same family', async () => {
    const { refreshToken } = await auth.login('alice', 'Str0ng!Passw0rd');
    const oldPayload = await jwt.verifyRefreshToken(refreshToken);

    const rotated = await auth.refresh(refreshToken);
    const newPayload = await jwt.verifyRefreshToken(rotated.refreshToken);

    expect(newPayload.jti).not.toBe(oldPayload.jti);
    expect(storedTokens.get(oldPayload.jti).consumedAt).not.toBeNull();
    expect(storedTokens.get(newPayload.jti).familyId).toBe(
      storedTokens.get(oldPayload.jti).familyId,
    );
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'TOKEN_REFRESHED' }),
    );
  });

  // Evidence: Refresh replay detection
  it('refresh() replay: reusing a consumed token revokes the whole family', async () => {
    const { refreshToken } = await auth.login('alice', 'Str0ng!Passw0rd');
    await auth.refresh(refreshToken); // rotates; old token now consumed

    await expect(auth.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    expect(refreshTokens.revokeFamily).toHaveBeenCalled();
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'REFRESH_TOKEN_REUSE_DETECTED' }),
    );
  });

  it('refresh() replay: the successor token is also rejected once the family is revoked', async () => {
    const { refreshToken } = await auth.login('alice', 'Str0ng!Passw0rd');
    const rotated = await auth.refresh(refreshToken);
    await auth.refresh(refreshToken).catch(() => undefined); // triggers family revocation

    await expect(auth.refresh(rotated.refreshToken)).rejects.toThrow(UnauthorizedException);
  });

  it('refresh() rejects an unknown jti', async () => {
    const foreignJwt = new AppJwtService();
    const bogusToken = foreignJwt.signRefreshToken({ sub: 'user-1', jti: 'never-issued' }, 3600);
    await expect(auth.refresh(bogusToken)).rejects.toThrow(UnauthorizedException);
  });

  it('logout() revokes the token family', async () => {
    const { refreshToken } = await auth.login('alice', 'Str0ng!Passw0rd');
    await auth.logout(refreshToken);

    expect(refreshTokens.revokeFamily).toHaveBeenCalled();
    await expect(auth.refresh(refreshToken)).rejects.toThrow(UnauthorizedException);
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'LOGOUT' }),
    );
  });

  // Evidence: configurable registration policy
  describe('register()', () => {
    beforeEach(() => {
      users.findByUsername.mockResolvedValue(null as any);
      users.create.mockResolvedValue({
        _id: 'user-new',
        username: 'bob',
        passwordHash: 'x',
        roles: ['STUDENT'],
      } as any);
    });

    it('forces STUDENT and audits the blocked attempt when self-assigned roles are disallowed (default)', async () => {
      delete process.env['ALLOW_SELF_ASSIGNED_ROLES'];

      await auth.register('bob', 'Str0ng!Passw0rd', ['ADMIN']);

      expect(users.create).toHaveBeenCalledWith('bob', expect.any(String), ['STUDENT']);
      expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'REGISTRATION_ROLE_ESCALATION_BLOCKED',
          after: expect.objectContaining({ requestedRoles: ['ADMIN'], grantedRoles: ['STUDENT'] }),
        }),
      );
      expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'USER_REGISTERED' }),
      );
    });

    it('does not audit an escalation-blocked event when no elevated role was requested', async () => {
      delete process.env['ALLOW_SELF_ASSIGNED_ROLES'];

      await auth.register('bob', 'Str0ng!Passw0rd');

      expect(users.create).toHaveBeenCalledWith('bob', expect.any(String), ['STUDENT']);
      expect(auditLog.recordSecurityEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'REGISTRATION_ROLE_ESCALATION_BLOCKED' }),
      );
    });

    it('honors requested roles when self-assigned roles are explicitly allowed', async () => {
      process.env['ALLOW_SELF_ASSIGNED_ROLES'] = 'true';

      await auth.register('bob', 'Str0ng!Passw0rd', ['ADMIN']);

      expect(users.create).toHaveBeenCalledWith('bob', expect.any(String), ['ADMIN']);
      expect(auditLog.recordSecurityEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'REGISTRATION_ROLE_ESCALATION_BLOCKED' }),
      );
      expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'USER_REGISTERED' }),
      );
    });
  });
});
