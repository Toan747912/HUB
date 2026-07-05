import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { IMessageRepository, MESSAGE_REPOSITORY } from '../domain/message-types';

const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Bounded retention for agent_messages: terminal messages (DELIVERED/
 * DEAD_LETTER) carry no operational value once past the retry/replay window,
 * so they're purged after RETENTION_MS instead of being kept forever like
 * agent-learning's collections. Non-terminal messages (QUEUED/DELIVERING/
 * RETRYING) are never touched here - only MessageBusService drives those.
 */
@Injectable()
export class MessageRetentionService {
  private readonly logger = new Logger(MessageRetentionService.name);

  constructor(@Inject(MESSAGE_REPOSITORY) private readonly repository: IMessageRepository) {}

  @Interval(SWEEP_INTERVAL_MS)
  async sweep(): Promise<void> {
    await this.purgeTerminal().catch((error) => {
      this.logger.warn(`Terminal agent_message purge failed: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  async purgeTerminal(now: Date = new Date()): Promise<{ deletedCount: number }> {
    const cutoff = new Date(now.getTime() - RETENTION_MS);
    const deletedCount = await this.repository.deleteTerminalOlderThan(cutoff);
    if (deletedCount > 0) {
      this.logger.log(`Purged ${deletedCount} terminal agent_message(s) older than ${cutoff.toISOString()}`);
    }
    return { deletedCount };
  }
}
