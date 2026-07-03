import { RoadmapDomainError } from '../errors/roadmap-domain.error';
import { RoadmapPhase } from '../entities/roadmap-phase.entity';

export const ensureNonEmptyPlan = (phases: RoadmapPhase[]): void => {
  if (phases.length === 0) {
    throw new RoadmapDomainError('ROADMAP_PLAN_EMPTY', 'A roadmap must contain at least one phase');
  }

  const hasMilestones = phases.every((phase) => phase.milestones.length > 0);
  if (!hasMilestones) {
    throw new RoadmapDomainError(
      'ROADMAP_PLAN_EMPTY',
      'Every phase must contain at least one milestone',
    );
  }

  const hasTasks = phases.every((phase) =>
    phase.milestones.every((milestone) => milestone.tasks.length > 0),
  );
  if (!hasTasks) {
    throw new RoadmapDomainError(
      'ROADMAP_PLAN_EMPTY',
      'Every milestone must contain at least one ordered task',
    );
  }
};
