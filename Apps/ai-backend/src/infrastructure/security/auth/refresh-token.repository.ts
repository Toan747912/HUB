import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
  constructor(@InjectModel('RefreshToken') private readonly model: Model<RefreshTokenDocument>) {}

  async save(input: CreateRefreshTokenInput): Promise<void> {
    await this.model.create({
      _id: input.jti,
      userId: input.userId,
      familyId: input.familyId,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      consumedAt: null,
      revokedAt: null,
      replacedByTokenId: null
    });
  }

  async findById(jti: string): Promise<RefreshTokenDocument | null> {
    return this.model.findById(jti).lean<RefreshTokenDocument>().exec();
  }

  async markConsumed(jti: string, replacedByTokenId: string): Promise<void> {
    await this.model.updateOne({ _id: jti }, { $set: { consumedAt: new Date(), replacedByTokenId } });
  }

  async revoke(jti: string): Promise<void> {
    await this.model.updateOne({ _id: jti }, { $set: { revokedAt: new Date() } });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.model.updateMany(
      { familyId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }

  /** Active = exists, not consumed, not revoked, not expired. */
  async isActive(jti: string): Promise<boolean> {
    const doc = await this.findById(jti);
    if (!doc) return false;
    if (doc.consumedAt || doc.revokedAt) return false;
    if (doc.expiresAt.getTime() < Date.now()) return false;
    return true;
  }
}
