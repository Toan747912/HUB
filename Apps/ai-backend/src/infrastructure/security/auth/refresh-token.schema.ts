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
