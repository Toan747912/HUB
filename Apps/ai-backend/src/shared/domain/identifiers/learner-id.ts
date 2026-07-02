import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class LearnerId extends Identifier<'Learner'> {
  public static create(value: string): LearnerId {
    return new LearnerId(value);
  }

  public static generate(): LearnerId {
    return new LearnerId(randomUUID());
  }
}
