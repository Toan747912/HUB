import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class TaskId extends Identifier<'Task'> {
  public static create(value: string): TaskId {
    return new TaskId(value);
  }

  public static generate(): TaskId {
    return new TaskId(randomUUID());
  }
}
