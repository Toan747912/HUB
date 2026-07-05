export interface TeachingAction {
  actionType: string;
  description: string;
  rationale: string;
}

export interface TeachingPlan {
  teachingId: string;
  userId: string;
  actions: TeachingAction[];
  primaryAction: string;
  focusSummary: string;
}
