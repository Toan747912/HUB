import { MemoryScope } from './memory-scope';

export interface MemoryRecord {
  id: string;
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
