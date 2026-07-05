import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../persistence/prisma.service';
import { Permission } from '../rbac/permission.enum';
import { ApiKeyDocument } from './api-key.schema';

@Injectable()
export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByHash(keyHash: string): Promise<ApiKeyDocument | null> {
    const row = await this.prisma.apiKey.findFirst({ where: { keyHash, revokedAt: null } });
    return row ? this.toDocument(row) : null;
  }

  async create(
    keyHash: string,
    label: string,
    permissions: Permission[] = [],
  ): Promise<ApiKeyDocument> {
    const row = await this.prisma.apiKey.create({
      data: {
        id: randomUUID(),
        keyHash,
        label,
        revokedAt: null,
        permissions: permissions as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toDocument(row);
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): ApiKeyDocument {
    return {
      _id: row.id,
      keyHash: row.keyHash,
      label: row.label,
      createdAt: row.createdAt,
      revokedAt: row.revokedAt,
      permissions: row.permissions,
    };
  }
}
