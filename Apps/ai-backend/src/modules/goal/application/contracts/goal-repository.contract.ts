import { PrismaTransactionClient } from '../../../../infrastructure/persistence/with-transaction';
import { Goal } from '../../domain/aggregates/goal.aggregate';

export interface IGoalRepository {
  save(goal: Goal, tx?: PrismaTransactionClient): Promise<void>;
  findById(id: string): Promise<Goal | null>;
  findAll(): Promise<Goal[]>;
  delete(id: string): Promise<void>;
}

export const GOAL_REPOSITORY = Symbol('IGoalRepository');
