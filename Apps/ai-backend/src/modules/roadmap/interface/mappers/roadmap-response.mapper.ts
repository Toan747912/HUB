import { Injectable } from '@nestjs/common';
import { Roadmap } from '../../domain/aggregates/roadmap.aggregate';
import {
  RoadmapHistoryResponseDto,
  RoadmapListResponseDto,
  RoadmapProgressResponseDto,
  RoadmapResponseDto
} from '../dto/responses/roadmap.response.dto';

@Injectable()
export class RoadmapResponseMapper {
  toResponse(roadmap: Roadmap): RoadmapResponseDto {
    const progress = roadmap.getProgress();
    return {
      roadmapId: roadmap.getId(),
      goalId: roadmap.getGoalId(),
      learnerId: roadmap.getGoalSnapshot().learnerId,
      status: roadmap.getStatus(),
      version: roadmap.getAggregateVersion(),
      phases: roadmap.getPhases().map((phase) => ({
        id: phase.id,
        title: phase.title,
        order: phase.order,
        milestones: phase.milestones.map((milestone) => ({
          id: milestone.id,
          title: milestone.title,
          order: milestone.order,
          reached: milestone.reached,
          tasks: milestone.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            order: task.order,
            dependsOn: task.dependsOn,
            estimatedDurationDays: task.estimatedDurationDays,
            complexity: task.complexity,
            completed: task.completed
          }))
        }))
      })),
      estimatedDurationDays: roadmap.getEstimatedDurationDays(),
      complexity: roadmap.getComplexity(),
      plannerVersion: roadmap.getPlannerVersion(),
      progress: {
        completionRatio: progress.completionRatio,
        completedTaskIds: [...progress.completedTaskIds]
      }
    };
  }

  toList(roadmaps: Roadmap[]): RoadmapListResponseDto {
    const items = roadmaps.map((r) => this.toResponse(r));
    return { items, total: items.length };
  }

  toProgress(roadmap: Roadmap): RoadmapProgressResponseDto {
    const progress = roadmap.getProgress();
    return {
      roadmapId: roadmap.getId(),
      status: roadmap.getStatus(),
      completionRatio: progress.completionRatio,
      completedTaskIds: [...progress.completedTaskIds]
    };
  }

  toHistory(roadmap: Roadmap): RoadmapHistoryResponseDto {
    return {
      roadmapId: roadmap.getId(),
      revisions: roadmap.getRevisions().map((revision) => ({
        version: revision.version,
        reason: revision.reason,
        plannerVersion: revision.plannerVersion,
        phaseCount: revision.phaseCount,
        milestoneCount: revision.milestoneCount,
        taskCount: revision.taskCount,
        estimatedDurationDays: revision.estimatedDurationDays,
        complexity: revision.complexity,
        createdAt: revision.createdAt.toISOString()
      }))
    };
  }
}
