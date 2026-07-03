import { PlanningResult, ResolvedPlanningResult } from '../roadmap-planning.types';

// Test-only stand-in for RoadmapCommandService#resolveSkills — deterministic,
// no SkillCatalogService/DB round trip needed for domain-level tests.
export const resolveTestPlan = (plan: PlanningResult): ResolvedPlanningResult => ({
  ...plan,
  phases: plan.phases.map((phase) => ({
    ...phase,
    milestones: phase.milestones.map((milestone) => ({
      ...milestone,
      tasks: milestone.tasks.map(({ skillLabel, ...task }) => ({
        ...task,
        skillId: `skill-${skillLabel}`,
      })),
    })),
  })),
});
