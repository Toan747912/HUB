import { Schema } from 'mongoose';

export interface ApiKeyDocument {
  _id: string;
  keyHash: string;
  label: string;
  createdAt: Date;
  revokedAt: Date | null;
}

export const ApiKeySchema = new Schema(
  {
    _id: { type: String },
    keyHash: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    revokedAt: { type: Date, required: false, default: null }
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'api_keys'
  }
);
