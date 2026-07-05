import { Permission } from '../rbac/permission.enum';

export interface ApiKeyDocument {
  _id: string;
  keyHash: string;
  label: string;
  createdAt: Date;
  revokedAt: Date | null;
  permissions: Permission[];
}
