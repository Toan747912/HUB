import { MigrationState } from '../enums/migration-state.enum';
import { MigrationStep } from './migration-step.entity';

export class MigrationJob {
  constructor(
    public readonly jobId: string,
    public readonly steps: MigrationStep[],
    public state: MigrationState = MigrationState.PENDING,
    public readonly metadata: Record<string, string> = {}
  ) {}
}
