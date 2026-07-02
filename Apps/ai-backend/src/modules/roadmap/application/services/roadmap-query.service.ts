import { Roadmap } from '../../domain/aggregates/roadmap.aggregate';
import { IRoadmapRepository } from '../contracts/roadmap-repository.contract';
import { RoadmapNotFoundError } from '../errors/application.errors';
import { GetRoadmapQuery } from '../queries/get-roadmap.query';
import { GetRoadmapsQuery } from '../queries/get-roadmaps.query';
import { GetRoadmapHistoryQuery } from '../queries/get-roadmap-history.query';
import { GetRoadmapProgressQuery } from '../queries/get-roadmap-progress.query';

export class RoadmapQueryService {
  constructor(private readonly repository: IRoadmapRepository) {}

  async getRoadmap(query: GetRoadmapQuery): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.repository.findById(query.roadmapId);
      if (!roadmap) throw new RoadmapNotFoundError(query.roadmapId);
      this.log('GET_ROADMAP', query.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('GET_ROADMAP', query.roadmapId, start, 'FAILURE', error);
      throw error;
    }
  }

  async getRoadmaps(query: GetRoadmapsQuery): Promise<Roadmap[]> {
    const start = Date.now();
    try {
      const roadmaps = await this.repository.findAll(query.learnerId);
      this.log('GET_ROADMAPS', query.learnerId ?? 'all', start, 'SUCCESS');
      return roadmaps;
    } catch (error) {
      this.log('GET_ROADMAPS', query.learnerId ?? 'all', start, 'FAILURE', error);
      throw error;
    }
  }

  async getRoadmapHistory(query: GetRoadmapHistoryQuery): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.repository.findById(query.roadmapId);
      if (!roadmap) throw new RoadmapNotFoundError(query.roadmapId);
      this.log('GET_ROADMAP_HISTORY', query.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('GET_ROADMAP_HISTORY', query.roadmapId, start, 'FAILURE', error);
      throw error;
    }
  }

  async getRoadmapProgress(query: GetRoadmapProgressQuery): Promise<Roadmap> {
    const start = Date.now();
    try {
      const roadmap = await this.repository.findById(query.roadmapId);
      if (!roadmap) throw new RoadmapNotFoundError(query.roadmapId);
      this.log('GET_ROADMAP_PROGRESS', query.roadmapId, start, 'SUCCESS');
      return roadmap;
    } catch (error) {
      this.log('GET_ROADMAP_PROGRESS', query.roadmapId, start, 'FAILURE', error);
      throw error;
    }
  }

  private log(operation: string, aggregateId: string, startMs: number, status: string, error?: unknown): void {
    console.log(
      JSON.stringify({
        traceId: 'app',
        aggregateId,
        operation,
        latencyMs: Date.now() - startMs,
        status,
        errorType: error instanceof Error ? error.constructor.name : undefined,
        timestamp: new Date().toISOString()
      })
    );
  }
}
