import { Global, Module } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';

// Global: AuditLogService is now a cross-cutting concern used by both OutboxPublisherService
// (domain event auditing) and PermissionGuard/AuthService (security event auditing).
@Global()
@Module({
  providers: [AuditLogRepository, AuditLogService],
  exports: [AuditLogRepository, AuditLogService],
})
export class AuditModule {}
