import { PrismaTransactionClient } from '../../../../infrastructure/persistence/with-transaction';
import { Roadmap } from '../../domain/aggregates/roadmap.aggregate';

export interface IRoadmapRepository {
  save(roadmap: Roadmap, tx?: PrismaTransactionClient): Promise<void>;
  findById(id: string): Promise<Roadmap | null>;
  findAll(learnerId?: string): Promise<Roadmap[]>;
  findByGoalId(goalId: string): Promise<Roadmap[]>;
  delete(id: string): Promise<void>;
}

export const ROADMAP_REPOSITORY = Symbol('IRoadmapRepository');
