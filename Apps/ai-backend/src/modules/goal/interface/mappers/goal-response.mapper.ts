import { Injectable } from '@nestjs/common';
import { GoalResponseDto } from '../dto/responses/goal.response.dto';

type GoalLike = {
  id?: string;
  goalId?: string;
  learnerId?: string;
  title?: string;
  description?: string;
  type?: unknown;
  difficulty?: unknown;
  priority?: unknown;
  status?: unknown;
  targetDate?: unknown;
  version?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

@Injectable()
export class GoalResponseMapper {
  toResponse(goal: GoalLike): GoalResponseDto {
    return {
      goalId: String(goal.goalId ?? goal.id ?? ''),
      learnerId: String(goal.learnerId ?? ''),
      title: String(goal.title ?? ''),
      description: String(goal.description ?? ''),
      type: String(goal.type ?? ''),
      difficulty: String(goal.difficulty ?? ''),
      priority: String(goal.priority ?? ''),
      status: String(goal.status ?? ''),
      targetDate: this.toIso(goal.targetDate),
      version: Number(goal.version ?? 0),
      createdAt: this.toIso(goal.createdAt),
      updatedAt: this.toIso(goal.updatedAt),
    };
  }

  toList(goals: GoalLike[]): GoalResponseDto[] {
    console.log(
      JSON.stringify({
        marker: 'GOAL_CALL_CHAIN',
        stage: 'mapper.toList.enter',
        goalsType: typeof goals,
        isArray: Array.isArray(goals),
        goalsLength: Array.isArray(goals) ? goals.length : undefined,
      }),
    );

    try {
      const result = goals.map((g) => this.toResponse(g));
      console.log(
        JSON.stringify({
          marker: 'GOAL_CALL_CHAIN',
          stage: 'mapper.toList.afterMap',
          resultType: typeof result,
          isArray: Array.isArray(result),
          resultLength: Array.isArray(result) ? result.length : undefined,
        }),
      );
      return result;
    } catch (error) {
      console.log(
        JSON.stringify({
          marker: 'GOAL_CALL_CHAIN',
          stage: 'mapper.toList.error',
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        }),
      );
      throw error;
    }
  }

  private toIso(input: unknown): string {
    if (!input) return '';
    if (input instanceof Date) return input.toISOString();
    const asDate = new Date(String(input));
    return Number.isNaN(asDate.getTime()) ? String(input) : asDate.toISOString();
  }
}
