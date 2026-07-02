import { Goal } from '../../domain/aggregates/goal.aggregate';
import { IGoalRepository } from '../contracts/goal-repository.contract';
import { GoalNotFoundError } from '../errors/application.errors';
import { GetGoalQuery } from '../queries/get-goal.query';
import { GetGoalsQuery } from '../queries/get-goals.query';
import { GetGoalHistoryQuery } from '../queries/get-goal-history.query';
import { GetGoalProgressQuery } from '../queries/get-goal-progress.query';

export class GoalQueryService {
  constructor(private readonly repository: IGoalRepository) {}

  async getGoal(query: GetGoalQuery): Promise<Goal> {
    const start = Date.now();
    try {
      const goal = await this.repository.findById(query.goalId);
      if (!goal) throw new GoalNotFoundError(query.goalId);
      this.log('GET_GOAL', query.goalId, start, 'SUCCESS');
      return goal;
    } catch (error) {
      this.log('GET_GOAL', query.goalId, start, 'FAILURE', error);
      throw error;
    }
  }

  async getGoals(_query: GetGoalsQuery): Promise<Goal[]> {
    const start = Date.now();
    try {
      console.log(
        JSON.stringify({
          marker: 'GOAL_CALL_CHAIN',
          stage: 'queryService.getGoals.enter',
          repositoryDefined: this.repository !== undefined && this.repository !== null,
          repositoryType: this.repository?.constructor?.name,
          hasFindAll: typeof (this.repository as any)?.findAll === 'function'
        })
      );

      const goals = await this.repository.findAll();

      console.log(
        JSON.stringify({
          marker: 'GOAL_CALL_CHAIN',
          stage: 'queryService.getGoals.afterFindAll',
          goalsType: typeof goals,
          isArray: Array.isArray(goals),
          goalsLength: Array.isArray(goals) ? goals.length : undefined
        })
      );

      this.log('GET_GOALS', 'all', start, 'SUCCESS');
      return goals;
    } catch (error) {
      console.log(
        JSON.stringify({
          marker: 'GOAL_CALL_CHAIN',
          stage: 'queryService.getGoals.error',
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        })
      );
      this.log('GET_GOALS', 'all', start, 'FAILURE', error);
      throw error;
    }
  }

  async getGoalHistory(query: GetGoalHistoryQuery): Promise<Goal> {
    const start = Date.now();
    try {
      const goal = await this.repository.findById(query.goalId);
      if (!goal) throw new GoalNotFoundError(query.goalId);
      this.log('GET_GOAL_HISTORY', query.goalId, start, 'SUCCESS');
      return goal;
    } catch (error) {
      this.log('GET_GOAL_HISTORY', query.goalId, start, 'FAILURE', error);
      throw error;
    }
  }

  async getGoalProgress(query: GetGoalProgressQuery): Promise<Goal> {
    const start = Date.now();
    try {
      const goal = await this.repository.findById(query.goalId);
      if (!goal) throw new GoalNotFoundError(query.goalId);
      this.log('GET_GOAL_PROGRESS', query.goalId, start, 'SUCCESS');
      return goal;
    } catch (error) {
      this.log('GET_GOAL_PROGRESS', query.goalId, start, 'FAILURE', error);
      throw error;
    }
  }

  private log(
    operation: string,
    aggregateId: string,
    startMs: number,
    status: string,
    error?: unknown
  ): void {
    const entry = {
      traceId: 'app',
      aggregateId,
      operation,
      latencyMs: Date.now() - startMs,
      status,
      errorType: error instanceof Error ? error.constructor.name : undefined,
      timestamp: new Date().toISOString()
    };
    console.log(JSON.stringify(entry));
  }
}
