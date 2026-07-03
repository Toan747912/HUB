export type PlanningInput = {
  goalId: string;
  learnerId: string;
  title: string;
  description: string;
  goalType: string;
  difficulty: string;
  priority: string;
  constraints: string[];
  targetDate: string;
};

export type PlannedTask = {
  id: string;
  title: string;
  order: number;
  dependsOn: string[];
  estimatedDurationDays: number;
  complexity: string;
  // Deterministic skill label (e.g. a phase name like "Foundations") emitted
  // by the planner. Not yet a canonical SkillId — see ResolvedPlannedTask.
  skillLabel: string;
};

export type PlannedMilestone = {
  id: string;
  title: string;
  order: number;
  tasks: PlannedTask[];
};

export type PlannedPhase = {
  id: string;
  title: string;
  order: number;
  milestones: PlannedMilestone[];
};

export type PlanningResult = {
  plannerVersion: string;
  phases: PlannedPhase[];
  estimatedDurationDays: number;
  complexity: string;
};

// Same shape as the planner output, but each task's skillLabel has been
// resolved to a real SkillCatalogService entry. This is the type the
// Roadmap aggregate actually persists — the raw PlanningResult never
// reaches storage.
export type ResolvedPlannedTask = Omit<PlannedTask, 'skillLabel'> & { skillId: string };

export type ResolvedPlannedMilestone = Omit<PlannedMilestone, 'tasks'> & {
  tasks: ResolvedPlannedTask[];
};

export type ResolvedPlannedPhase = Omit<PlannedPhase, 'milestones'> & {
  milestones: ResolvedPlannedMilestone[];
};

export type ResolvedPlanningResult = Omit<PlanningResult, 'phases'> & {
  phases: ResolvedPlannedPhase[];
};
