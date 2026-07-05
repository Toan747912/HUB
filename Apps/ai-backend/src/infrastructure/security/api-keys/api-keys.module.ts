import { Module } from '@nestjs/common';
import { AuditModule } from '../../audit/audit.module';
import { ApiKeyRepository } from './api-key.repository';
import { ApiKeyService } from './api-key.service';

@Module({
  imports: [AuditModule],
  providers: [ApiKeyRepository, ApiKeyService],
  exports: [ApiKeyRepository, ApiKeyService],
})
export class ApiKeysModule {}
