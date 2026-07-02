import { Roadmap } from '../../domain/aggregates/roadmap.aggregate';

export interface IRoadmapRepository {
  save(roadmap: Roadmap): Promise<void>;
  findById(id: string): Promise<Roadmap | null>;
  findAll(learnerId?: string): Promise<Roadmap[]>;
  delete(id: string): Promise<void>;
}

export const ROADMAP_REPOSITORY = Symbol('IRoadmapRepository');
