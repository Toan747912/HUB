import { MemoryScope } from '../domain/memory-scope';

export interface MemoryRecordDocument {
  _id: string;
  scope: MemoryScope;
  scopeId: string;
  key: string;
  value: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  version: number;
  tags: string[];
}
