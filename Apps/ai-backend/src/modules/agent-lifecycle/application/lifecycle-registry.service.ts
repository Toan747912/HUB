import { Inject, Injectable } from '@nestjs/common';
import { LifecycleState } from '../domain/lifecycle-state';
import { assertValidLifecycleTransition } from '../domain/lifecycle-transition';
import {
  AgentInstance,
  ILifecycleRepository,
  LIFECYCLE_REPOSITORY,
  LifecycleError,
  LifecycleErrorCode,
} from '../domain/lifecycle.types';

/**
 * In-memory cache of active agent instances backed by the Mongo repository.
 * Owns transition validation so no caller can move an instance through an
 * illegal state change; every accepted transition is persisted immediately.
 */
@Injectable()
export class LifecycleRegistryService {
  private readonly cache = new Map<string, AgentInstance>();

  constructor(@Inject(LIFECYCLE_REPOSITORY) private readonly repository: ILifecycleRepository) {}

  async create(instance: AgentInstance): Promise<AgentInstance> {
    const saved = await this.repository.create(instance);
    this.cache.set(saved.instanceId, saved);
    return saved;
  }

  async transition(
    instanceId: string,
    to: LifecycleState,
    patch: Partial<AgentInstance> = {},
  ): Promise<AgentInstance> {
    const current = await this.resolve(instanceId);
    assertValidLifecycleTransition(instanceId, current.status, to);
    const updated = await this.repository.update(instanceId, { ...patch, status: to });
    this.cache.set(instanceId, updated);
    return updated;
  }

  async patch(instanceId: string, patch: Partial<AgentInstance>): Promise<AgentInstance> {
    await this.resolve(instanceId);
    const updated = await this.repository.update(instanceId, patch);
    this.cache.set(instanceId, updated);
    return updated;
  }

  async get(instanceId: string): Promise<AgentInstance> {
    return this.resolve(instanceId);
  }

  async recoverAll(): Promise<AgentInstance[]> {
    const active = await this.repository.findActive();
    for (const instance of active) {
      this.cache.set(instance.instanceId, instance);
    }
    return active;
  }

  private async resolve(instanceId: string): Promise<AgentInstance> {
    const cached = this.cache.get(instanceId);
    if (cached) return cached;

    const found = await this.repository.findById(instanceId);
    if (!found) {
      throw new LifecycleError(
        LifecycleErrorCode.INSTANCE_NOT_FOUND,
        `Agent instance not found: ${instanceId}`,
        instanceId,
      );
    }
    this.cache.set(instanceId, found);
    return found;
  }
}
