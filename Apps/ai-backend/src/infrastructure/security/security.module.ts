import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionGuard } from './rbac/permission.guard';

@Global()
@Module({
  imports: [AuthModule, ApiKeysModule, AuditModule],
  providers: [JwtAuthGuard, PermissionGuard],
  exports: [AuthModule, ApiKeysModule, JwtAuthGuard, PermissionGuard],
})
export class SecurityModule {}
