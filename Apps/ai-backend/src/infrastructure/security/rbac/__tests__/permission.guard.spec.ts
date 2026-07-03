import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditLogService } from '../../../audit/audit-log.service';
import { RequestContextService } from '../../../observability/request-context.service';
import { AuthenticatedRequest } from '../../jwt-auth.guard';
import { PermissionGuard } from '../permission.guard';

describe('PermissionGuard', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let auditLog: jest.Mocked<Pick<AuditLogService, 'recordSecurityEvent'>>;
  let guard: PermissionGuard;

  const makeContext = (user?: {
    sub: string;
    roles: string[];
    permissions?: string[];
  }): ExecutionContext => {
    const request: Partial<AuthenticatedRequest> = {
      user: user as any,
      method: 'DELETE',
      originalUrl: '/goal/123',
      route: { path: '/goal/:id' } as any,
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}) as any,
      getClass: () => ({}) as any,
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    auditLog = { recordSecurityEvent: jest.fn().mockResolvedValue(undefined) };
    guard = new PermissionGuard(
      reflector as unknown as Reflector,
      auditLog as unknown as AuditLogService,
    );
  });

  it('allows access when no permissions are required on the route', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeContext({ sub: 'user-1', roles: ['STUDENT'] });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  // Evidence: RBAC
  it('allows access when the role satisfies the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Goal.Read']);
    const context = makeContext({ sub: 'user-1', roles: ['STUDENT'] });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  // Evidence: Permission denial
  it('denies access with 403 when the role lacks the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Goal.Archive']);
    const context = makeContext({ sub: 'user-1', roles: ['STUDENT'] });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('records a PERMISSION_DENIED audit event on denial', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Goal.Delete']);
    const context = makeContext({ sub: 'user-42', roles: ['TEACHER'] });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-42',
        operation: 'PERMISSION_DENIED',
        resource: 'DELETE /goal/:id',
      }),
    );
  });

  it('denies access when there is no authenticated user at all', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Goal.Read']);
    const context = makeContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('works without an AuditLogService provided (backward compatible)', async () => {
    const bareGuard = new PermissionGuard(reflector as unknown as Reflector);
    reflector.getAllAndOverride.mockReturnValue(['Goal.Archive']);
    const context = makeContext({ sub: 'user-1', roles: ['STUDENT'] });

    await expect(bareGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('records a PERMISSION_GRANTED audit event on a successful permission check', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Goal.Read']);
    const context = makeContext({ sub: 'user-1', roles: ['STUDENT'] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        operation: 'PERMISSION_GRANTED',
        resource: 'DELETE /goal/:id',
      }),
    );
  });

  it('does not audit anything when the route requires no permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = makeContext({ sub: 'user-1', roles: ['STUDENT'] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(auditLog.recordSecurityEvent).not.toHaveBeenCalled();
  });

  // Evidence: scoped API-key permissions
  it('allows a SYSTEM/API-key request only for permissions present in its scoped permissions array', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Goal.Read']);
    const context = makeContext({ sub: 'system', roles: ['SYSTEM'], permissions: ['Goal.Read'] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a SYSTEM/API-key request for a permission outside its scoped permissions array, even though role is SYSTEM', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Goal.Archive']);
    const context = makeContext({ sub: 'system', roles: ['SYSTEM'], permissions: ['Goal.Read'] });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('denies a SYSTEM/API-key request with an empty scoped permissions array (least privilege default)', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Goal.Read']);
    const context = makeContext({ sub: 'system', roles: ['SYSTEM'], permissions: [] });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
