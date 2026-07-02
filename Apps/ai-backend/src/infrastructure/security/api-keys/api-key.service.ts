import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ApiKeyRepository } from './api-key.repository';

@Injectable()
export class ApiKeyService {
  constructor(private readonly repository: ApiKeyRepository) {}

  private hash(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  /** Raw key is returned exactly once at creation time; only its hash is persisted. */
  async issue(label: string): Promise<string> {
    const rawKey = randomBytes(32).toString('hex');
    await this.repository.create(this.hash(rawKey), label);
    return rawKey;
  }

  async verify(rawKey: string): Promise<boolean> {
    const record = await this.repository.findActiveByHash(this.hash(rawKey));
    return record !== null;
  }

  async revoke(id: string): Promise<void> {
    await this.repository.revoke(id);
  }
}
