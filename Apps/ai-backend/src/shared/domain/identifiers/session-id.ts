import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class SessionId extends Identifier<'LearningSession'> {
  public static create(value: string): SessionId {
    return new SessionId(value);
  }

  public static generate(): SessionId {
    return new SessionId(randomUUID());
  }
}
