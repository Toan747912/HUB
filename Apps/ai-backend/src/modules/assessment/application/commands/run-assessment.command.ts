import {
  AssessmentHistorySignal,
  AssessmentTaskSignal,
} from '../../domain/engine/assessment-engine.types';

export class RunAssessmentCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly roadmapCompletionRatio: number,
    public readonly tasks: AssessmentTaskSignal[],
    public readonly revisionCount: number,
    public readonly previousRuns: AssessmentHistorySignal[],
    public readonly expectedVersion: number | undefined,
    public readonly traceId: string,
    public readonly correlationId: string,
    public readonly causationId: string,
  ) {}
}
