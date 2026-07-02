export interface SkillDocument {
  _id: string;
  skillId: string;
  name: string;
  normalizedName: string;
  category: string;
  parentSkillId: string | null;
  aliases: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
