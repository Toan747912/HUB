import {
  GoalId,
  LearnerId,
  MilestoneId,
  PhaseId,
  RoadmapId,
  SkillId,
  TaskId,
} from '../../../../../shared/domain/identifiers';
import { Roadmap } from '../../../domain/aggregates/roadmap.aggregate';
import { RoadmapPhase } from '../../../domain/entities/roadmap-phase.entity';
import { RoadmapMilestone } from '../../../domain/entities/roadmap-milestone.entity';
import { RoadmapTask } from '../../../domain/entities/roadmap-task.entity';
import { RoadmapProgress } from '../../../domain/entities/roadmap-progress.entity';
import {
  RoadmapRevision,
  RoadmapRevisionReason,
} from '../../../domain/entities/roadmap-revision.entity';
import { RoadmapStatus } from '../../../domain/value-objects/roadmap-status.vo';
import { RoadmapDocument } from '../documents/roadmap.document';

export class RoadmapPersistenceMapper {
  static toDocument(roadmap: Roadmap): RoadmapDocument {
    const phases = roadmap.getPhases().map((phase) => ({
      id: phase.id.toString(),
      title: phase.title,
      order: phase.order,
      milestones: phase.milestones.map((milestone) => ({
        id: milestone.id.toString(),
        title: milestone.title,
        order: milestone.order,
        reached: milestone.reached,
        reachedAt: milestone.reachedAt,
        tasks: milestone.tasks.map((task) => ({
          id: task.id.toString(),
          title: task.title,
          order: task.order,
          dependsOn: task.dependsOn.map((id) => id.toString()),
          estimatedDurationDays: task.estimatedDurationDays,
          complexity: task.complexity,
          skillId: task.skillId.toString(),
          completed: task.completed,
          completedAt: task.completedAt,
        })),
      })),
    }));

    const revisions = roadmap.getRevisions().map((revision) => ({
      version: revision.version,
      reason: revision.reason,
      plannerVersion: revision.plannerVersion,
      phaseCount: revision.phaseCount,
      milestoneCount: revision.milestoneCount,
      taskCount: revision.taskCount,
      estimatedDurationDays: revision.estimatedDurationDays,
      complexity: revision.complexity,
      createdAt: revision.createdAt,
    }));

    const progress = roadmap.getProgress();
    const goalSnapshot = roadmap.getGoalSnapshot();

    return {
      _id: roadmap.getId().toString(),
      goalId: roadmap.getGoalId().toString(),
      learnerId: goalSnapshot.learnerId,
      status: roadmap.getStatus(),
      aggregateVersion: roadmap.getAggregateVersion(),
      phases,
      revisions,
      progress: {
        completionRatio: progress.completionRatio,
        completedTaskIds: [...progress.completedTaskIds],
        updatedAt: progress.updatedAt,
      },
      estimatedDurationDays: roadmap.getEstimatedDurationDays(),
      complexity: roadmap.getComplexity(),
      plannerVersion: roadmap.getPlannerVersion(),
      goalSnapshot,
      invalidatedAt: roadmap.getInvalidatedAt(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // TypeScript private fields are compile-time only; direct property assignment
  // is the accepted reconstitution pattern when the aggregate has no static reconstruct factory.
  static toDomain(doc: RoadmapDocument): Roadmap {
    const roadmap = Object.create(Roadmap.prototype) as Roadmap;

    (roadmap as any).roadmapId = RoadmapId.create(doc._id);
    (roadmap as any).goalId = GoalId.create(doc.goalId);
    (roadmap as any).learnerId = LearnerId.create(doc.learnerId);
    (roadmap as any).status = RoadmapStatus.create(doc.status);
    (roadmap as any).aggregateVersion = doc.aggregateVersion;
    (roadmap as any).pendingEvents = [];
    (roadmap as any).estimatedDurationDays = doc.estimatedDurationDays;
    (roadmap as any).complexity = doc.complexity;
    (roadmap as any).plannerVersion = doc.plannerVersion;
    (roadmap as any).goalSnapshot = doc.goalSnapshot;
    (roadmap as any).invalidatedAt = doc.invalidatedAt ?? null;

    (roadmap as any).phases = doc.phases.map(
      (phase) =>
        new RoadmapPhase(
          PhaseId.create(phase.id),
          phase.title,
          phase.order,
          phase.milestones.map(
            (milestone) =>
              new RoadmapMilestone(
                MilestoneId.create(milestone.id),
                milestone.title,
                milestone.order,
                milestone.tasks.map(
                  (task) =>
                    new RoadmapTask(
                      TaskId.create(task.id),
                      task.title,
                      task.order,
                      task.dependsOn.map((id) => TaskId.create(id)),
                      task.estimatedDurationDays,
                      task.complexity,
                      SkillId.create(task.skillId),
                      task.completed,
                      task.completedAt,
                    ),
                ),
                milestone.reached,
                milestone.reachedAt,
              ),
          ),
        ),
    );

    (roadmap as any).revisions = doc.revisions.map(
      (revision) =>
        new RoadmapRevision(
          revision.version,
          revision.reason as RoadmapRevisionReason,
          revision.plannerVersion,
          revision.phaseCount,
          revision.milestoneCount,
          revision.taskCount,
          revision.estimatedDurationDays,
          revision.complexity,
          revision.createdAt,
        ),
    );

    (roadmap as any).progress = new RoadmapProgress(
      doc.progress.completionRatio,
      doc.progress.completedTaskIds,
      doc.progress.updatedAt,
    );

    return roadmap;
  }
}
