import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SkillId } from '../../../../../shared/domain/identifiers';
import { Skill } from '../../../domain/aggregates/skill.aggregate';
import { ISkillRepository } from '../../../application/contracts/skill-repository.contract';
import { SkillDocument } from '../documents/skill.document';
import { SkillPersistenceMapper } from '../mappers/skill-persistence.mapper';

export class MongoSkillRepository implements ISkillRepository {
  constructor(@InjectModel('Skill') private readonly model: Model<SkillDocument>) {}

  async save(skill: Skill): Promise<void> {
    const doc = SkillPersistenceMapper.toDocument(skill);
    const { _id, createdAt, ...mutableFields } = doc;
    await this.model.findByIdAndUpdate(
      _id,
      {
        $set: { ...mutableFields, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: 'after' },
    );
  }

  async findById(skillId: SkillId): Promise<Skill | null> {
    const doc = await this.model.findById(skillId.toString()).lean<SkillDocument>().exec();
    return doc ? SkillPersistenceMapper.toDomain(doc) : null;
  }

  async findByNormalizedName(normalizedName: string): Promise<Skill | null> {
    const doc = await this.model.findOne({ normalizedName }).lean<SkillDocument>().exec();
    return doc ? SkillPersistenceMapper.toDomain(doc) : null;
  }
}
