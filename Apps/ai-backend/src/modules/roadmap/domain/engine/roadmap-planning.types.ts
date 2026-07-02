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
