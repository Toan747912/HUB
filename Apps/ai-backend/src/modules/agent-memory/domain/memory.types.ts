import { MemoryRecord } from './memory-record';
import { MemoryScope } from './memory-scope';

export interface MemorySetInput {
  scope: MemoryScope;
  scopeId: string;
  key: string;
  value: unknown;
  ttlMs?: number;
  tags?: string[];
}

export interface MemoryGetInput {
  scope: MemoryScope;
  scopeId: string;
  key: string;
}

export interface MemoryDeleteInput {
  scope: MemoryScope;
  scopeId: string;
  key: string;
}

/**
 * Carries just enough of IAgentContext for the audit trail (traceId/userId)
 * without agent-memory depending on agent-core's context shape.
 */
export interface MemoryOperationContext {
  traceId: string;
  userId: string | null;
}

export interface IMemoryRepository {
  set(input: MemorySetInput): Promise<MemoryRecord>;
  get(input: MemoryGetInput): Promise<MemoryRecord | null>;
  delete(input: MemoryDeleteInput): Promise<boolean>;
  list(scope: MemoryScope, scopeId: string): Promise<MemoryRecord[]>;
  queryByTag(tag: string, scope?: MemoryScope): Promise<MemoryRecord[]>;
  queryByScope(scope: MemoryScope): Promise<MemoryRecord[]>;
  deleteExpired(now: Date): Promise<number>;
}

export const MEMORY_REPOSITORY = Symbol('MEMORY_REPOSITORY');
