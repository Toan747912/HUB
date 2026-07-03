import { Schema } from 'mongoose';

export interface RefreshTokenDocument {
  _id: string; // jti
  userId: string;
  familyId: string;
  issuedAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  revokedAt: Date | null;
  replacedByTokenId: string | null;
}

export const RefreshTokenSchema = new Schema(
  {
    _id: { type: String },
    userId: { type: String, required: true, index: true },
    familyId: { type: String, required: true, index: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, required: false, default: null },
    revokedAt: { type: Date, required: false, default: null },
    replacedByTokenId: { type: String, required: false, default: null },
  },
  {
    _id: false,
    collection: 'refresh_tokens',
  },
);
