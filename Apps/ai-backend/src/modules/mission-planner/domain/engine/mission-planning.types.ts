export type MissionTaskSource = 'roadmap' | 'recommendation' | 'review';

export interface MissionTask {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  source: MissionTaskSource;
}

export interface MissionPlan {
  missionId: string;
  goalId: string;
  sessionId: string;
  date: string;
  tasks: MissionTask[];
  focusSummary: string;
}
