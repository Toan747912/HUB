import { Schema } from 'mongoose';
import { Permission } from '../rbac/permission.enum';

export interface ApiKeyDocument {
  _id: string;
  keyHash: string;
  label: string;
  createdAt: Date;
  revokedAt: Date | null;
  permissions: Permission[];
}

export const ApiKeySchema = new Schema(
  {
    _id: { type: String },
    keyHash: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    revokedAt: { type: Date, required: false, default: null },
    // Principle of least privilege: an API key grants nothing until explicitly scoped.
    permissions: { type: [String], required: false, default: [] },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'api_keys',
  },
);
