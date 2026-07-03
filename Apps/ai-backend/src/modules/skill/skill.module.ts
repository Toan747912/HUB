import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SkillSchema } from './infrastructure/persistence/schemas/skill.schema';
import { MongoSkillRepository } from './infrastructure/persistence/repositories/mongo-skill.repository';
import { SKILL_REPOSITORY } from './application/contracts/skill-repository.contract';
import { SkillCatalogService } from './application/services/skill-catalog.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Skill', schema: SkillSchema }])],
  providers: [
    {
      provide: SKILL_REPOSITORY,
      useClass: MongoSkillRepository,
    },
    {
      provide: SkillCatalogService,
      useFactory: (repository: any) => new SkillCatalogService(repository),
      inject: [SKILL_REPOSITORY],
    },
  ],
  exports: [SkillCatalogService],
})
export class SkillModule {}
