export type SkillCategoryValue = 'TECHNICAL' | 'CONCEPTUAL' | 'PRACTICAL' | 'OTHER';

const ALLOWED_CATEGORIES: SkillCategoryValue[] = ['TECHNICAL', 'CONCEPTUAL', 'PRACTICAL', 'OTHER'];

export class SkillCategory {
  private constructor(private readonly value: SkillCategoryValue) {}

  static create(value: string): SkillCategory {
    const normalized = value?.toUpperCase().replace(/\s+/g, '_') as SkillCategoryValue;
    if (!ALLOWED_CATEGORIES.includes(normalized)) {
      throw new Error('SKILL_CATEGORY_INVALID');
    }
    return new SkillCategory(normalized);
  }

  static other(): SkillCategory {
    return new SkillCategory('OTHER');
  }

  getValue(): SkillCategoryValue {
    return this.value;
  }
}
