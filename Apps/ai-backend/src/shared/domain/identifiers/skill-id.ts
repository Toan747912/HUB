import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class SkillId extends Identifier<'Skill'> {
  public static create(value: string): SkillId {
    return new SkillId(value);
  }

  public static generate(): SkillId {
    return new SkillId(randomUUID());
  }
}
