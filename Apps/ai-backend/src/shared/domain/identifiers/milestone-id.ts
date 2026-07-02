import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class MilestoneId extends Identifier<'Milestone'> {
  public static create(value: string): MilestoneId {
    return new MilestoneId(value);
  }

  public static generate(): MilestoneId {
    return new MilestoneId(randomUUID());
  }
}
