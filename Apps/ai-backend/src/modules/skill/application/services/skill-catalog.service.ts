import { Inject, Injectable } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { SkillId } from '../../../../shared/domain/identifiers';
import { withTransaction } from '../../../../infrastructure/persistence/with-transaction';
import { Skill, SkillEventContext } from '../../domain/aggregates/skill.aggregate';
import { SkillDomainEvent } from '../../domain/events/skill-event-metadata';
import { ISkillRepository, SKILL_REPOSITORY } from '../contracts/skill-repository.contract';
import { IEventPublisher, EVENT_PUBLISHER } from '../contracts/event-publisher.contract';
import { SkillPersistenceMapper } from '../../infrastructure/persistence/mappers/skill-persistence.mapper';

export interface FoundOrCreatedSkill {
  skill: Skill;
  events: SkillDomainEvent[];
}

@Injectable()
export class SkillCatalogService {
  constructor(
    @Inject(SKILL_REPOSITORY) private readonly repository: ISkillRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: IEventPublisher,
    @Inject(getConnectionToken()) private readonly connection: Connection,
  ) {}

  /**
   * Normalizes the given name and looks up an existing catalog entry by it.
   * Creates a new one if none exists yet. This is the core operation used
   * by the skillArea -> skillId migration mechanism.
   *
   * When `session` is supplied, the caller (e.g. Roadmap's command service)
   * is already inside its own transaction — the new Skill's save + outbox
   * stage join that session, and the caller is responsible for publishing
   * the returned events after its own transaction commits (via
   * `publishEvents`). When no session is supplied, this method manages its
   * own transaction and publishes immediately after commit.
   */
  async findOrCreateByName(
    name: string,
    context?: SkillEventContext,
    session?: ClientSession,
  ): Promise<FoundOrCreatedSkill> {
    const normalizedName = SkillPersistenceMapper.normalizeName(name);
    const existing = await this.repository.findByNormalizedName(normalizedName);
    if (existing) {
      return { skill: existing, events: [] };
    }

    if (session) {
      const skill = Skill.generate({ name }, context);
      await this.repository.save(skill, session);
      const events = skill.pullEvents();
      await this.eventPublisher.stage(events, session);
      return { skill, events };
    }

    const result = await withTransaction(this.connection, async (s) => {
      const skill = Skill.generate({ name }, context);
      await this.repository.save(skill, s);
      const events = skill.pullEvents();
      await this.eventPublisher.stage(events, s);
      return { skill, events };
    });
    await this.eventPublisher.publishMany(result.events);
    return result;
  }

  async publishEvents(events: SkillDomainEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.eventPublisher.publishMany(events);
  }

  async findById(skillId: SkillId): Promise<Skill | null> {
    return this.repository.findById(skillId);
  }
}
