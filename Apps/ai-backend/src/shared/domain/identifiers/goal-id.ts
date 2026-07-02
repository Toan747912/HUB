import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class GoalId extends Identifier<'Goal'> {
  public static create(value: string): GoalId {
    return new GoalId(value);
  }

  public static generate(): GoalId {
    return new GoalId(randomUUID());
  }
}
