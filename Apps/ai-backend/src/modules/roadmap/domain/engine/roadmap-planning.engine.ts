import { RoadmapComplexity } from '../value-objects/roadmap-complexity.vo';
import { PriorityWeight } from '../value-objects/priority-weight.vo';
import { PlannedMilestone, PlannedPhase, PlannedTask, PlanningInput, PlanningResult } from './roadmap-planning.types';

export const ROADMAP_PLANNER_VERSION = 'planner-v1';

const PHASE_COUNT_BY_DIFFICULTY: Record<string, number> = {
  BEGINNER: 2,
  INTERMEDIATE: 3,
  ADVANCED: 4,
  EXPERT: 5
};

const BASE_DAYS_BY_DIFFICULTY: Record<string, number> = {
  BEGINNER: 2,
  INTERMEDIATE: 3,
  ADVANCED: 4,
  EXPERT: 5
};

const DIFFICULTY_RANK: Record<string, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
  EXPERT: 3
};

const PHASE_TITLE_POOL = ['Foundations', 'Core Skills', 'Applied Practice', 'Advanced Mastery', 'Specialization & Transfer'];

/**
 * Deterministic, rule-based roadmap planner. No LLM, no randomness: identical
 * PlanningInput always yields an identical PlanningResult (same shape and ids),
 * which is what satisfies the "roadmap generation must be reproducible" rule.
 */
export class RoadmapPlanningEngine {
  generate(input: PlanningInput): PlanningResult {
    const difficulty = input.difficulty.toUpperCase();
    const priorityWeight = PriorityWeight.fromGoalPriority(input.priority).getValue();

    const phaseCount = PHASE_COUNT_BY_DIFFICULTY[difficulty] ?? 3;
    const baseDaysPerTask = BASE_DAYS_BY_DIFFICULTY[difficulty] ?? 3;
    const milestonesPerPhase = input.constraints.length > 2 ? 3 : 2;
    const extraTaskForPriority = priorityWeight >= 3 ? 1 : 0;
    const tasksPerMilestone = 2 + extraTaskForPriority;

    const phases: PlannedPhase[] = [];
    let previousTaskId: string | undefined;
    let totalDurationDays = 0;
    let taskCounter = 0;

    for (let phaseIndex = 0; phaseIndex < phaseCount; phaseIndex++) {
      const phaseId = `${input.goalId}-phase-${phaseIndex + 1}`;
      const phaseTitle = `Phase ${phaseIndex + 1}: ${PHASE_TITLE_POOL[phaseIndex] ?? `Progression ${phaseIndex + 1}`}`;
      const milestones: PlannedMilestone[] = [];

      for (let milestoneIndex = 0; milestoneIndex < milestonesPerPhase; milestoneIndex++) {
        const milestoneId = `${phaseId}-milestone-${milestoneIndex + 1}`;
        const milestoneTitle = `${phaseTitle} - Milestone ${milestoneIndex + 1}`;
        const tasks: PlannedTask[] = [];

        for (let taskIndex = 0; taskIndex < tasksPerMilestone; taskIndex++) {
          taskCounter += 1;
          const taskId = `${milestoneId}-task-${taskIndex + 1}`;
          const dependsOn = previousTaskId ? [previousTaskId] : [];
          const durationDays = this.estimateTaskDuration(baseDaysPerTask, priorityWeight);
          const taskComplexity = RoadmapComplexity.fromScore(DIFFICULTY_RANK[difficulty] ?? 1).getValue();

          tasks.push({
            id: taskId,
            title: `Task ${taskCounter}: ${input.title} - step ${taskIndex + 1}`,
            order: taskIndex + 1,
            dependsOn,
            estimatedDurationDays: durationDays,
            complexity: taskComplexity
          });

          totalDurationDays += durationDays;
          previousTaskId = taskId;
        }

        milestones.push({
          id: milestoneId,
          title: milestoneTitle,
          order: milestoneIndex + 1,
          tasks
        });
      }

      phases.push({
        id: phaseId,
        title: phaseTitle,
        order: phaseIndex + 1,
        milestones
      });
    }

    const complexityScore =
      (DIFFICULTY_RANK[difficulty] ?? 1) * 3 + input.constraints.length + priorityWeight;

    return {
      plannerVersion: ROADMAP_PLANNER_VERSION,
      phases,
      estimatedDurationDays: totalDurationDays,
      complexity: RoadmapComplexity.fromScore(complexityScore).getValue()
    };
  }

  private estimateTaskDuration(baseDaysPerTask: number, priorityWeight: number): number {
    // Priority balancing: higher-priority goals compress the per-task estimate
    // slightly so the overall timeline reflects urgency, without ever hitting zero.
    const compressionFactor = 1 - (priorityWeight - 1) * 0.05;
    return Math.max(1, Math.round(baseDaysPerTask * compressionFactor));
  }
}
