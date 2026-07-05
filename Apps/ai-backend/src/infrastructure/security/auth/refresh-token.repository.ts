import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma.service';
import { RefreshTokenDocument } from './refresh-token.schema';

export interface CreateRefreshTokenInput {
  jti: string;
  userId: string;
  familyId: string;
  issuedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: CreateRefreshTokenInput): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        id: input.jti,
        userId: input.userId,
        familyId: input.familyId,
        issuedAt: input.issuedAt,
        expiresAt: input.expiresAt,
        consumedAt: null,
        revokedAt: null,
        replacedByTokenId: null,
      },
    });
  }

  async findById(jti: string): Promise<RefreshTokenDocument | null> {
    const row = await this.prisma.refreshToken.findUnique({ where: { id: jti } });
    return row ? this.toDocument(row) : null;
  }

  async markConsumed(jti: string, replacedByTokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: jti },
      data: { consumedAt: new Date(), replacedByTokenId },
    });
  }

  async revoke(jti: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: jti },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Active = exists, not consumed, not revoked, not expired. */
  async isActive(jti: string): Promise<boolean> {
    const doc = await this.findById(jti);
    if (!doc) return false;
    if (doc.consumedAt || doc.revokedAt) return false;
    if (doc.expiresAt.getTime() < Date.now()) return false;
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): RefreshTokenDocument {
    return {
      _id: row.id,
      userId: row.userId,
      familyId: row.familyId,
      issuedAt: row.issuedAt,
      expiresAt: row.expiresAt,
      consumedAt: row.consumedAt,
      revokedAt: row.revokedAt,
      replacedByTokenId: row.replacedByTokenId,
    };
  }
}
