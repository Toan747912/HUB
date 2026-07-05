import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../infrastructure/persistence/prisma.service';
import { PrismaTransactionClient } from '../../../../../infrastructure/persistence/with-transaction';
import { SkillId } from '../../../../../shared/domain/identifiers';
import { Skill } from '../../../domain/aggregates/skill.aggregate';
import { ISkillRepository } from '../../../application/contracts/skill-repository.contract';
import { SkillDocument } from '../documents/skill.document';
import { SkillPersistenceMapper } from '../mappers/skill-persistence.mapper';

@Injectable()
export class PrismaSkillRepository implements ISkillRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(skill: Skill, tx?: PrismaTransactionClient): Promise<void> {
    const doc = SkillPersistenceMapper.toDocument(skill);
    const { _id, createdAt, ...mutableFields } = doc;
    const client = tx ?? this.prisma;
    await client.skill.upsert({
      where: { id: _id },
      update: {
        skillId: mutableFields.skillId,
        name: mutableFields.name,
        normalizedName: mutableFields.normalizedName,
        category: mutableFields.category,
        parentSkillId: mutableFields.parentSkillId,
        aliases: mutableFields.aliases as unknown as Prisma.InputJsonValue,
        metadata: mutableFields.metadata as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      create: {
        id: _id,
        skillId: mutableFields.skillId,
        name: mutableFields.name,
        normalizedName: mutableFields.normalizedName,
        category: mutableFields.category,
        parentSkillId: mutableFields.parentSkillId,
        aliases: mutableFields.aliases as unknown as Prisma.InputJsonValue,
        metadata: mutableFields.metadata as unknown as Prisma.InputJsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findById(skillId: SkillId): Promise<Skill | null> {
    const row = await this.prisma.skill.findUnique({ where: { id: skillId.toString() } });
    return row ? SkillPersistenceMapper.toDomain(this.toDocument(row)) : null;
  }

  async findByNormalizedName(normalizedName: string): Promise<Skill | null> {
    const row = await this.prisma.skill.findUnique({ where: { normalizedName } });
    return row ? SkillPersistenceMapper.toDomain(this.toDocument(row)) : null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): SkillDocument {
    return {
      _id: row.id,
      skillId: row.skillId,
      name: row.name,
      normalizedName: row.normalizedName,
      category: row.category,
      parentSkillId: row.parentSkillId,
      aliases: row.aliases,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
