import { SkillId } from '../../../../shared/domain/identifiers';
import { SkillCategory } from '../value-objects/skill-category.vo';

export type SkillCreateProps = {
  skillId: SkillId;
  name: string;
  category?: SkillCategory;
  parentSkillId?: SkillId | null;
  aliases?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * Skill is a catalog/lookup entry, not a workflow aggregate — there is no
 * draft/published/archived lifecycle, no commands, no lifecycle invariants.
 * It exists purely to give `skillArea` free text a canonical, deduplicated
 * owner (see WP-06C Workstream B).
 */
export class Skill {
  private constructor(
    private readonly skillId: SkillId,
    private name: string,
    private category: SkillCategory,
    private parentSkillId: SkillId | null,
    private aliases: string[],
    private metadata: Record<string, unknown>,
  ) {}

  static create(props: SkillCreateProps): Skill {
    return new Skill(
      props.skillId,
      props.name,
      props.category ?? SkillCategory.other(),
      props.parentSkillId ?? null,
      props.aliases ? [...props.aliases] : [],
      props.metadata ? { ...props.metadata } : {},
    );
  }

  static generate(props: Omit<SkillCreateProps, 'skillId'>): Skill {
    return Skill.create({ ...props, skillId: SkillId.generate() });
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
