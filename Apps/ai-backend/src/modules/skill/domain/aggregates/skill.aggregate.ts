import { randomUUID } from 'crypto';
import { SkillId } from '../../../../shared/domain/identifiers';
import { SkillCategory } from '../value-objects/skill-category.vo';
import { SkillDomainEvent, SkillEventMetadata } from '../events/skill-event-metadata';
import { skillCreatedEvent } from '../events/skill-events';

export type SkillCreateProps = {
  skillId: SkillId;
  name: string;
  category?: SkillCategory;
  parentSkillId?: SkillId | null;
  aliases?: string[];
  metadata?: Record<string, unknown>;
};

export type SkillEventContext = {
  traceId: string;
  correlationId: string;
  causationId: string;
};

/**
 * Skill is a catalog/lookup entry, not a workflow aggregate — there is no
 * draft/published/archived lifecycle, no commands, no lifecycle invariants.
 * It exists purely to give `skillArea` free text a canonical, deduplicated
 * owner (see WP-06C Workstream B).
 */
export class Skill {
  private aggregateVersion = 0;
  private pendingEvents: SkillDomainEvent[] = [];

  private constructor(
    private readonly skillId: SkillId,
    private name: string,
    private category: SkillCategory,
    private parentSkillId: SkillId | null,
    private aliases: string[],
    private metadata: Record<string, unknown>,
  ) {}

  static create(props: SkillCreateProps, context?: SkillEventContext): Skill {
    const aggregate = new Skill(
      props.skillId,
      props.name,
      props.category ?? SkillCategory.other(),
      props.parentSkillId ?? null,
      props.aliases ? [...props.aliases] : [],
      props.metadata ? { ...props.metadata } : {},
    );
    aggregate.recordEvent(
      skillCreatedEvent(aggregate.buildMetadata(context ?? Skill.defaultContext()), {
        name: aggregate.name,
        category: aggregate.category.getValue(),
      }),
    );
    return aggregate;
  }

  static generate(props: Omit<SkillCreateProps, 'skillId'>, context?: SkillEventContext): Skill {
    return Skill.create({ ...props, skillId: SkillId.generate() }, context);
  }

  private static defaultContext(): SkillEventContext {
    const id = randomUUID();
    return { traceId: id, correlationId: id, causationId: id };
  }

  pullEvents(): SkillDomainEvent[] {
    const events = [...this.pendingEvents];
    this.pendingEvents = [];
    return events;
  }

  private buildMetadata(context: SkillEventContext): SkillEventMetadata {
    return {
      eventId: randomUUID(),
      aggregateId: this.skillId,
      aggregateType: 'Skill',
      aggregateVersion: this.aggregateVersion,
      occurredAt: new Date().toISOString(),
      traceId: context.traceId,
      correlationId: context.correlationId,
      causationId: context.causationId,
    };
  }

  private recordEvent(event: SkillDomainEvent): void {
    this.pendingEvents.push(event);
  }

  getId(): SkillId {
    return this.skillId;
  }

  getName(): string {
    return this.name;
  }

  getCategory(): SkillCategory {
    return this.category;
  }

  getParentSkillId(): SkillId | null {
    return this.parentSkillId;
  }

  getAliases(): string[] {
    return [...this.aliases];
  }

  getMetadata(): Record<string, unknown> {
    return { ...this.metadata };
  }
}
