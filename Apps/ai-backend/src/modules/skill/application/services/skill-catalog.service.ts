import { Inject, Injectable } from '@nestjs/common';
import { SkillId } from '../../../../shared/domain/identifiers';
import { Skill } from '../../domain/aggregates/skill.aggregate';
import { ISkillRepository, SKILL_REPOSITORY } from '../contracts/skill-repository.contract';
import { SkillPersistenceMapper } from '../../infrastructure/persistence/mappers/skill-persistence.mapper';

@Injectable()
export class SkillCatalogService {
  constructor(@Inject(SKILL_REPOSITORY) private readonly repository: ISkillRepository) {}

  /**
   * Normalizes the given name and looks up an existing catalog entry by it.
   * Creates a new one if none exists yet. This is the core operation used
   * by the skillArea -> skillId migration mechanism.
   */
  async findOrCreateByName(name: string): Promise<Skill> {
    const normalizedName = SkillPersistenceMapper.normalizeName(name);
    const existing = await this.repository.findByNormalizedName(normalizedName);
    if (existing) {
      return existing;
    }

    const skill = Skill.generate({ name });
    await this.repository.save(skill);
    return skill;
  }

  async findById(skillId: SkillId): Promise<Skill | null> {
    return this.repository.findById(skillId);
  }
}
