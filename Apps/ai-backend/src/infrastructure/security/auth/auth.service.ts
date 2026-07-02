import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../../audit/audit-log.service';
import { RequestContextService } from '../../observability/request-context.service';
import { Role } from '../rbac/role.enum';
import { getRefreshTokenTtlSeconds, isSelfAssignedRolesAllowed } from '../secrets/security.config';
import { BruteForceService } from './brute-force.service';
import { AppJwtService } from './jwt.service';
import { PasswordService } from './password.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UserRepository } from './user.repository';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly jwt: AppJwtService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly bruteForce: BruteForceService,
    private readonly auditLog?: AuditLogService,
    private readonly requestContext?: RequestContextService
  ) {}

  private traceId(): string {
    return this.requestContext?.get()?.traceId ?? 'unknown';
  }

  async register(username: string, password: string, requestedRoles: Role[] = ['STUDENT']): Promise<void> {
    this.passwords.validatePolicy(password);
    const existing = await this.users.findByUsername(username);
    if (existing) {
      throw new ForbiddenException({ success: false, error: 'USERNAME_TAKEN', message: 'Username already exists' });
    }

    const selfAssignedRolesAllowed = isSelfAssignedRolesAllowed();
    const isElevationAttempt = requestedRoles.some((role) => role !== 'STUDENT');
    const roles: Role[] = selfAssignedRolesAllowed ? requestedRoles : ['STUDENT'];

    if (!selfAssignedRolesAllowed && isElevationAttempt) {
      await this.auditLog?.recordSecurityEvent({
        traceId: this.traceId(),
        userId: null,
        operation: 'REGISTRATION_ROLE_ESCALATION_BLOCKED',
        resource: `User:${username}`,
        after: { requestedRoles, grantedRoles: roles }
      });
    }

    const passwordHash = await this.passwords.hash(password);
    const created = await this.users.create(username, passwordHash, roles);

    await this.auditLog?.recordSecurityEvent({
      traceId: this.traceId(),
      userId: created?._id ?? null,
      operation: 'USER_REGISTERED',
      resource: `User:${created?._id ?? username}`,
      after: { username, roles }
    });
  }

  async login(username: string, password: string): Promise<TokenPair> {
    if (await this.bruteForce.isLocked(username)) {
      await this.auditLog?.recordSecurityEvent({
        traceId: this.traceId(),
        userId: null,
        operation: 'LOGIN_FAILED',
        resource: `User:${username}`,
        after: { reason: 'ACCOUNT_LOCKED' }
      });
      throw new UnauthorizedException({ success: false, error: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Try again later.' });
    }

    const user = await this.users.findByUsername(username);
    const valid = user ? await this.passwords.verify(password, user.passwordHash) : false;

    if (!user || !valid) {
      await this.bruteForce.recordFailure(username);
      await this.auditLog?.recordSecurityEvent({
        traceId: this.traceId(),
        userId: user?._id ?? null,
        operation: 'LOGIN_FAILED',
        resource: `User:${username}`,
        after: { reason: 'INVALID_CREDENTIALS' }
      });
      throw new UnauthorizedException({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    }

    await this.bruteForce.reset(username);
    const familyId = randomUUID();
    const pair = await this.issueTokenPair(user._id, user.roles as Role[], familyId);

    await this.auditLog?.recordSecurityEvent({
      traceId: this.traceId(),
      userId: user._id,
      operation: 'LOGIN_SUCCESS',
      resource: `User:${user._id}`
    });

    return pair;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.jwt.verifyRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findById(payload.jti);

    if (!stored) {
      throw new UnauthorizedException({ success: false, error: 'INVALID_REFRESH_TOKEN', message: 'Refresh token not recognized' });
    }

    if (stored.consumedAt || stored.revokedAt) {
      // Replay: a token that was already rotated (or revoked) is being reused —
      // treat the entire rotation family as compromised.
      await this.refreshTokens.revokeFamily(stored.familyId);
      await this.auditLog?.recordSecurityEvent({
        traceId: this.traceId(),
        userId: stored.userId,
        operation: 'REFRESH_TOKEN_REUSE_DETECTED',
        resource: `User:${stored.userId}`,
        after: { familyId: stored.familyId, jti: payload.jti }
      });
      throw new UnauthorizedException({
        success: false,
        error: 'REFRESH_TOKEN_REUSE_DETECTED',
        message: 'This refresh token has already been used. All sessions in this family have been revoked.'
      });
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({ success: false, error: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token has expired' });
    }

    const user = await this.users.findById(stored.userId);
    if (!user) {
      throw new UnauthorizedException({ success: false, error: 'INVALID_REFRESH_TOKEN', message: 'User no longer exists' });
    }

    const newPair = await this.issueTokenPair(stored.userId, user.roles as Role[], stored.familyId);
    const newPayload = await this.jwt.verifyRefreshToken(newPair.refreshToken);
    await this.refreshTokens.markConsumed(payload.jti, newPayload.jti);

    await this.auditLog?.recordSecurityEvent({
      traceId: this.traceId(),
      userId: stored.userId,
      operation: 'TOKEN_REFRESHED',
      resource: `User:${stored.userId}`
    });

    return newPair;
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.jwt.verifyRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findById(payload.jti);
    if (stored) {
      await this.refreshTokens.revokeFamily(stored.familyId);
    }

    await this.auditLog?.recordSecurityEvent({
      traceId: this.traceId(),
      userId: stored?.userId ?? null,
      operation: 'LOGOUT',
      resource: `User:${stored?.userId ?? 'unknown'}`
    });
  }

  private async issueTokenPair(userId: string, roles: Role[], familyId: string): Promise<TokenPair> {
    const jti = randomUUID();
    const ttlSeconds = getRefreshTokenTtlSeconds();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + ttlSeconds * 1000);

    await this.refreshTokens.save({ jti, userId, familyId, issuedAt, expiresAt });

    return {
      accessToken: this.jwt.signAccessToken({ sub: userId, roles }),
      refreshToken: this.jwt.signRefreshToken({ sub: userId, jti }, ttlSeconds)
    };
  }
}
