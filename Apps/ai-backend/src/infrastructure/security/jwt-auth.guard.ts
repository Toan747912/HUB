import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeyService } from './api-keys/api-key.service';
import { AppJwtService } from './auth/jwt.service';
import { RequestContextService } from '../observability/request-context.service';
import { IS_PUBLIC_METADATA_KEY } from './rbac/public.decorator';
import { Permission } from './rbac/permission.enum';
import { Role } from './rbac/role.enum';
import { getApiKeyHeaderName } from './secrets/security.config';

export interface AuthenticatedUser {
  sub: string;
  roles: Role[];
  permissions?: Permission[];
}

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
  traceId?: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: AppJwtService,
    private readonly apiKeys?: ApiKeyService,
    private readonly requestContext?: RequestContextService,
    private readonly reflector?: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const apiKey = request.headers[getApiKeyHeaderName()] as string | undefined;
    if (apiKey) {
      const verifiedKey = await this.apiKeys?.verify(apiKey);
      if (!verifiedKey) {
        throw new UnauthorizedException({
          success: false,
          error: 'INVALID_API_KEY',
          message: 'Invalid or revoked API key',
        });
      }
      request.user = {
        sub: 'system',
        roles: ['SYSTEM'],
        permissions: verifiedKey.permissions ?? [],
      };
      this.setUserId('system');
      return true;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Missing or malformed Authorization header',
      });
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const payload = await this.jwt.verifyAccessToken(token);
      request.user = { sub: payload.sub, roles: payload.roles };
      this.setUserId(payload.sub);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid access token';
      const code =
        error instanceof Error && error.name === 'TokenExpiredError'
          ? 'TOKEN_EXPIRED'
          : 'INVALID_TOKEN';
      throw new UnauthorizedException({ success: false, error: code, message });
    }
  }

  private setUserId(userId: string): void {
    const current = this.requestContext?.get();
    if (current) {
      current.userId = userId;
    }
  }
}
