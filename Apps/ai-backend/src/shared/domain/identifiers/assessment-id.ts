import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class AssessmentId extends Identifier<'Assessment'> {
  public static create(value: string): AssessmentId {
    return new AssessmentId(value);
  }

  public static generate(): AssessmentId {
    return new AssessmentId(randomUUID());
  }
}
