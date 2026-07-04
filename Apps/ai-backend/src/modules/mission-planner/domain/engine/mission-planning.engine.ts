import { BrainContext } from '../../../../infrastructure/ai-brain/brain-context.types';
import { MissionPlan, MissionTask } from './mission-planning.types';

export const MISSION_FALLBACK_VERSION = 'mission-fallback-v1';

/**
 * Deterministic, rule-based mission planner. No LLM, no randomness: identical
 * BrainContext always yields an identical MissionPlan (same shape and ids).
 * Used whenever the LLM path is unavailable or its output cannot be trusted.
 */
export class MissionPlanningEngine {
  generate(context: BrainContext): MissionPlan {
    const tasks: MissionTask[] = [
      {
        id: `${context.goalId}-roadmap-task`,
        title: `Advance roadmap node ${context.roadmap.nodeId}`,
        description: `Continue work on "${context.roadmap.nodeId}" (status: ${context.roadmap.status}) toward goal "${context.goal.title}".`,
        estimatedMinutes: 30,
        source: 'roadmap',
      },
      {
        id: `${context.goalId}-recommendation-task`,
        title: 'Address top recommendation',
        description: `Apply the current recommendation state: ${context.recommendation.state}.`,
        estimatedMinutes: 20,
        source: 'recommendation',
      },
      {
        id: `${context.sessionId}-review-task`,
        title: 'Review session progress',
        description: `Reflect on learning session phase "${context.session.phase}" and log evidence.`,
        estimatedMinutes: 10,
        source: 'review',
      },
    ];

    return {
      missionId: `mission-${context.goalId}-${context.assembledAt}`,
      goalId: context.goalId,
      sessionId: context.sessionId,
      date: context.assembledAt.slice(0, 10),
      tasks,
      focusSummary: `Deterministic mission (${MISSION_FALLBACK_VERSION}) generated from roadmap node ${context.roadmap.nodeId} and recommendation state ${context.recommendation.state}.`,
    };
  }
}
