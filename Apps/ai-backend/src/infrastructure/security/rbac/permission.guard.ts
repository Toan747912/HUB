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
    private readonly requestContext?: RequestContextService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_METADATA_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const roles = request.user?.roles ?? [];

    const allowed = required.every((permission) => rolesHavePermission(roles, permission));
    if (allowed) {
      return true;
    }

    await this.auditLog?.recordSecurityEvent({
      traceId: this.requestContext?.get()?.traceId ?? request.traceId ?? 'unknown',
      userId: request.user?.sub ?? null,
      operation: 'PERMISSION_DENIED',
      resource: `${request.method} ${request.route?.path ?? request.originalUrl}`,
      after: { requiredPermissions: required, roles }
    });

    throw new ForbiddenException({
      success: false,
      error: 'PERMISSION_DENIED',
      message: `Missing required permission(s): ${required.join(', ')}`
    });
  }
}
