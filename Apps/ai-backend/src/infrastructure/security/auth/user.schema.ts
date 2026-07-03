import { Schema } from 'mongoose';
import { ROLES } from '../rbac/role.enum';

export interface UserDocument {
  _id: string;
  username: string;
  passwordHash: string;
  roles: string[];
  createdAt: Date;
}

export const UserSchema = new Schema(
  {
    _id: { type: String },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    roles: { type: [String], required: true, enum: ROLES, default: ['STUDENT'] },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'users',
  },
);
