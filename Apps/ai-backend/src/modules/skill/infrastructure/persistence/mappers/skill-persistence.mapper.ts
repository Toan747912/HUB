import { SkillId } from '../../../../../shared/domain/identifiers';
import { Skill } from '../../../domain/aggregates/skill.aggregate';
import { SkillCategory } from '../../../domain/value-objects/skill-category.vo';
import { SkillDocument } from '../documents/skill.document';

export class SkillPersistenceMapper {
  static normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  static toDocument(skill: Skill): SkillDocument {
    return {
      _id: skill.getId().toString(),
      skillId: skill.getId().toString(),
      name: skill.getName(),
      normalizedName: SkillPersistenceMapper.normalizeName(skill.getName()),
      category: skill.getCategory().getValue(),
      parentSkillId: skill.getParentSkillId() ? skill.getParentSkillId()!.toString() : null,
      aliases: skill.getAliases(),
      metadata: skill.getMetadata(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  static toDomain(doc: SkillDocument): Skill {
    return Skill.create({
      skillId: SkillId.create(doc.skillId),
      name: doc.name,
      category: SkillCategory.create(doc.category),
      parentSkillId: doc.parentSkillId ? SkillId.create(doc.parentSkillId) : null,
      aliases: doc.aliases,
      metadata: doc.metadata,
    });
  }
}
