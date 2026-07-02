import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError as JwtTokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { Role } from '../rbac/role.enum';
import { getAccessTokenTtl, getJwtSecret, getRefreshSecret } from '../secrets/security.config';

export class TokenExpiredError extends Error {
  constructor() {
    super('Token has expired');
    this.name = 'TokenExpiredError';
  }
}

export class InvalidSignatureError extends Error {
  constructor(message = 'Invalid token signature') {
    super(message);
    this.name = 'InvalidSignatureError';
  }
}

export interface AccessTokenPayload {
  sub: string;
  roles: Role[];
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class AppJwtService {
  private readonly jwt = new JwtService({});

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: getJwtSecret(),
      expiresIn: getAccessTokenTtl() as unknown as number
    });
  }

  signRefreshToken(payload: RefreshTokenPayload, expiresInSeconds: number): string {
    return this.jwt.sign(payload, { secret: getRefreshSecret(), expiresIn: expiresInSeconds });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.verify<AccessTokenPayload>(token, getJwtSecret());
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.verify<RefreshTokenPayload>(token, getRefreshSecret());
  }

  private async verify<T extends object>(token: string, secret: string): Promise<T> {
    try {
      return await this.jwt.verifyAsync<T>(token, { secret });
    } catch (error) {
      if (error instanceof JwtTokenExpiredError) {
        throw new TokenExpiredError();
      }
      if (error instanceof JsonWebTokenError) {
        throw new InvalidSignatureError(error.message);
      }
      throw error;
    }
  }
}
