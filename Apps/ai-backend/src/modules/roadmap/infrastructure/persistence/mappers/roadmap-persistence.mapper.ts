import { Roadmap } from '../../../domain/aggregates/roadmap.aggregate';
import { RoadmapPhase } from '../../../domain/entities/roadmap-phase.entity';
import { RoadmapMilestone } from '../../../domain/entities/roadmap-milestone.entity';
import { RoadmapTask } from '../../../domain/entities/roadmap-task.entity';
import { RoadmapProgress } from '../../../domain/entities/roadmap-progress.entity';
import { RoadmapRevision, RoadmapRevisionReason } from '../../../domain/entities/roadmap-revision.entity';
import { RoadmapStatus } from '../../../domain/value-objects/roadmap-status.vo';
import { RoadmapDocument } from '../documents/roadmap.document';

export class RoadmapPersistenceMapper {
  static toDocument(roadmap: Roadmap): RoadmapDocument {
    const phases = roadmap.getPhases().map((phase) => ({
      id: phase.id,
      title: phase.title,
      order: phase.order,
      milestones: phase.milestones.map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        order: milestone.order,
        reached: milestone.reached,
        reachedAt: milestone.reachedAt,
        tasks: milestone.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          order: task.order,
          dependsOn: task.dependsOn,
          estimatedDurationDays: task.estimatedDurationDays,
          complexity: task.complexity,
          completed: task.completed,
          completedAt: task.completedAt
        }))
      }))
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
      createdAt: revision.createdAt
    }));

    const progress = roadmap.getProgress();
    const goalSnapshot = roadmap.getGoalSnapshot();

    return {
      _id: roadmap.getId(),
      goalId: roadmap.getGoalId(),
      learnerId: goalSnapshot.learnerId,
      status: roadmap.getStatus(),
      aggregateVersion: roadmap.getAggregateVersion(),
      phases,
      revisions,
      progress: {
        completionRatio: progress.completionRatio,
        completedTaskIds: [...progress.completedTaskIds],
        updatedAt: progress.updatedAt
      },
      estimatedDurationDays: roadmap.getEstimatedDurationDays(),
      complexity: roadmap.getComplexity(),
      plannerVersion: roadmap.getPlannerVersion(),
      goalSnapshot,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // TypeScript private fields are compile-time only; direct property assignment
  // is the accepted reconstitution pattern when the aggregate has no static reconstruct factory.
  static toDomain(doc: RoadmapDocument): Roadmap {
    const roadmap = Object.create(Roadmap.prototype) as Roadmap;

    (roadmap as any).roadmapId = doc._id;
    (roadmap as any).goalId = doc.goalId;
    (roadmap as any).learnerId = doc.learnerId;
    (roadmap as any).status = RoadmapStatus.create(doc.status);
    (roadmap as any).aggregateVersion = doc.aggregateVersion;
    (roadmap as any).pendingEvents = [];
    (roadmap as any).estimatedDurationDays = doc.estimatedDurationDays;
    (roadmap as any).complexity = doc.complexity;
    (roadmap as any).plannerVersion = doc.plannerVersion;
    (roadmap as any).goalSnapshot = doc.goalSnapshot;

    (roadmap as any).phases = doc.phases.map(
      (phase) =>
        new RoadmapPhase(
          phase.id,
          phase.title,
          phase.order,
          phase.milestones.map(
            (milestone) =>
              new RoadmapMilestone(
                milestone.id,
                milestone.title,
                milestone.order,
                milestone.tasks.map(
                  (task) =>
                    new RoadmapTask(
                      task.id,
                      task.title,
                      task.order,
                      task.dependsOn,
                      task.estimatedDurationDays,
                      task.complexity,
                      task.completed,
                      task.completedAt
                    )
                ),
                milestone.reached,
                milestone.reachedAt
              )
          )
        )
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
          revision.createdAt
        )
    );

    (roadmap as any).progress = new RoadmapProgress(
      doc.progress.completionRatio,
      doc.progress.completedTaskIds,
      doc.progress.updatedAt
    );

    return roadmap;
  }
}
