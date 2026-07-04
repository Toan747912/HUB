import { ClientSession } from 'mongoose';
import { SkillId } from '../../../../shared/domain/identifiers';
import { Skill } from '../../domain/aggregates/skill.aggregate';

export const SKILL_REPOSITORY = Symbol('SKILL_REPOSITORY');

export interface ISkillRepository {
  save(skill: Skill, session?: ClientSession): Promise<void>;
  findById(skillId: SkillId): Promise<Skill | null>;
  findByNormalizedName(normalizedName: string): Promise<Skill | null>;
}
