import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { AuditLogService } from '../../audit/audit-log.service';
import { RequestContextService } from '../../observability/request-context.service';
import { Permission } from '../rbac/permission.enum';
import { ApiKeyDocument } from './api-key.schema';
import { ApiKeyRepository } from './api-key.repository';

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly auditLog?: AuditLogService,
    private readonly requestContext?: RequestContextService
  ) {}

  private hash(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  private traceId(): string {
    return this.requestContext?.get()?.traceId ?? 'unknown';
  }

  /**
   * Raw key is returned exactly once at creation time; only its hash is persisted.
   * Principle of least privilege: a key with no `permissions` grants nothing.
   */
  async issue(label: string, permissions: Permission[] = []): Promise<string> {
    const rawKey = randomBytes(32).toString('hex');
    const created = await this.repository.create(this.hash(rawKey), label, permissions);

    await this.auditLog?.recordSecurityEvent({
      traceId: this.traceId(),
      userId: this.requestContext?.get()?.userId ?? null,
      operation: 'API_KEY_ISSUED',
      resource: `ApiKey:${created._id}`,
      after: { label, permissions }
    });

    return rawKey;
  }

  async verify(rawKey: string): Promise<ApiKeyDocument | null> {
    return this.repository.findActiveByHash(this.hash(rawKey));
  }

  async revoke(id: string): Promise<void> {
    await this.repository.revoke(id);

    await this.auditLog?.recordSecurityEvent({
      traceId: this.traceId(),
      userId: this.requestContext?.get()?.userId ?? null,
      operation: 'API_KEY_REVOKED',
      resource: `ApiKey:${id}`
    });
  }
}
