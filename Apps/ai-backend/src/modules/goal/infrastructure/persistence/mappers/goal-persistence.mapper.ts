import { Goal } from '../../../domain/aggregates/goal.aggregate';
import { GoalConstraint } from '../../../domain/entities/goal-constraint.entity';
import { GoalMilestone } from '../../../domain/entities/goal-milestone.entity';
import { GoalProgress } from '../../../domain/entities/goal-progress.entity';
import { GoalVersion } from '../../../domain/entities/goal-version.entity';
import { GoalDifficulty } from '../../../domain/value-objects/goal-difficulty.vo';
import { GoalPriority } from '../../../domain/value-objects/goal-priority.vo';
import { GoalStatus } from '../../../domain/value-objects/goal-status.vo';
import { GoalType } from '../../../domain/value-objects/goal-type.vo';
import { TargetDate } from '../../../domain/value-objects/target-date.vo';
import { GoalDocument } from '../documents/goal.document';

export class GoalPersistenceMapper {
  static toDocument(goal: Goal): GoalDocument {
    const versions = goal.getVersions().map((v) => ({
      version: v.version,
      title: v.title,
      description: v.description,
      type: v.type.getValue(),
      difficulty: v.difficulty.getValue(),
      priority: v.priority.getValue(),
      targetDate: v.targetDate.getValue(),
      createdAt: v.createdAt
    }));

    const constraints = goal.getConstraints().map((c) => ({
      id: c.id,
      type: c.type,
      value: c.value,
      active: c.active,
      createdAt: c.createdAt
    }));

    const milestones = goal.getMilestones().map((m) => ({
      id: m.id,
      title: m.title,
      reached: m.reached,
      reachedAt: m.reachedAt
    }));

    const progress = goal.getProgress();

    return {
      _id: goal.getId(),
      learnerId: (goal as any).learnerId as string,
      status: goal.getStatus(),
      aggregateVersion: goal.getAggregateVersion(),
      versions,
      constraints,
      milestones,
      progress: {
        completionRatio: progress.completionRatio,
        reachedMilestoneIds: [...progress.reachedMilestoneIds],
        updatedAt: progress.updatedAt
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // TypeScript private fields are compile-time only; direct property assignment
  // is the accepted reconstitution pattern when the aggregate has no static reconstruct factory.
  static toDomain(doc: GoalDocument): Goal {
    const goal = Object.create(Goal.prototype) as Goal;

    (goal as any).goalId = doc._id;
    (goal as any).learnerId = doc.learnerId;
    (goal as any).status = GoalStatus.create(doc.status);
    (goal as any).aggregateVersion = doc.aggregateVersion;
    (goal as any).pendingEvents = [];

    (goal as any).versions = doc.versions.map(
      (v) =>
        new GoalVersion(
          v.version,
          v.title,
          v.description,
          GoalType.create(v.type),
          GoalDifficulty.create(v.difficulty),
          GoalPriority.create(v.priority),
          TargetDate.create(v.targetDate),
          v.createdAt
        )
    );

    (goal as any).constraints = doc.constraints.map(
      (c) => new GoalConstraint(c.id, c.type, c.value, c.active, c.createdAt)
    );

    (goal as any).milestones = doc.milestones.map(
      (m) => new GoalMilestone(m.id, m.title, m.reached, m.reachedAt)
    );

    (goal as any).progress = new GoalProgress(
      doc.progress.completionRatio,
      doc.progress.reachedMilestoneIds,
      doc.progress.updatedAt
    );

    return goal;
  }
}
