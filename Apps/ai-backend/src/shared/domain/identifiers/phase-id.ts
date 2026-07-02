import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class PhaseId extends Identifier<'Phase'> {
  public static create(value: string): PhaseId {
    return new PhaseId(value);
  }

  public static generate(): PhaseId {
    return new PhaseId(randomUUID());
  }
}
