import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuditLogService } from '../../audit/audit-log.service';
import { RequestContextService } from '../../observability/request-context.service';
import { AuthenticatedRequest } from '../jwt-auth.guard';
import { Permission } from './permission.enum';
import { PERMISSIONS_METADATA_KEY } from './require-permissions.decorator';
import { rolesHavePermission } from './role-permissions.map';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLog?: AuditLogService,
    private readonly requestContext?: RequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const roles = request.user?.roles ?? [];
    const scopedPermissions = request.user?.permissions;

    // API-key-authenticated requests (JwtAuthGuard sets `permissions`) are scoped
    // directly by the key's granted permission list; role-based (JWT) requests
    // continue to resolve permissions via role-permissions.map.ts, unchanged.
    const allowed = scopedPermissions
      ? required.every((permission) => scopedPermissions.includes(permission))
      : required.every((permission) => rolesHavePermission(roles, permission));

    if (allowed) {
      await this.auditLog?.recordSecurityEvent({
        traceId: this.requestContext?.get()?.traceId ?? request.traceId ?? 'unknown',
        userId: request.user?.sub ?? null,
        operation: 'PERMISSION_GRANTED',
        resource: `${request.method} ${request.route?.path ?? request.originalUrl}`,
        after: { requiredPermissions: required, roles },
      });
      return true;
    }

    await this.auditLog?.recordSecurityEvent({
      traceId: this.requestContext?.get()?.traceId ?? request.traceId ?? 'unknown',
      userId: request.user?.sub ?? null,
      operation: 'PERMISSION_DENIED',
      resource: `${request.method} ${request.route?.path ?? request.originalUrl}`,
      after: { requiredPermissions: required, roles },
    });

    throw new ForbiddenException({
      success: false,
      error: 'PERMISSION_DENIED',
      message: `Missing required permission(s): ${required.join(', ')}`,
    });
  }
}
