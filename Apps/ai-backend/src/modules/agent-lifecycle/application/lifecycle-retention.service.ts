import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ILifecycleRepository, LIFECYCLE_REPOSITORY } from '../domain/lifecycle.types';

const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Bounded retention for agent_instances: terminal instances (COMPLETED/
 * FAILED/STOPPED) are kept longer than agent_messages (30 days vs 7) since
 * they're the primary audit trail for what an agent actually did, but still
 * purged eventually rather than retained forever. Active instances are never
 * touched here - only LifecycleRegistryService/LifecycleService drive those.
 */
@Injectable()
export class LifecycleRetentionService {
  private readonly logger = new Logger(LifecycleRetentionService.name);

  constructor(@Inject(LIFECYCLE_REPOSITORY) private readonly repository: ILifecycleRepository) {}

  @Interval(SWEEP_INTERVAL_MS)
  async sweep(): Promise<void> {
    await this.purgeTerminal().catch((error) => {
      this.logger.warn(`Terminal agent_instance purge failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  async purgeTerminal(now: Date = new Date()): Promise<{ deletedCount: number }> {
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    const deletedCount = await this.repository.deleteTerminalOlderThan(cutoff);
    if (deletedCount > 0) {
      this.logger.log(`Purged ${deletedCount} terminal agent_instance(s) older than ${cutoff.toISOString()}`);
    }
    return { deletedCount };
  }
}
