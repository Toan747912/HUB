import { Schema } from 'mongoose';

export const SkillSchema = new Schema(
  {
    _id: { type: String },
    skillId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    normalizedName: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    parentSkillId: { type: String, required: false, default: null },
    aliases: { type: [String], required: true, default: [] },
    metadata: { type: Schema.Types.Mixed, required: true, default: {} }
  },
  {
    _id: false,
    timestamps: true,
    collection: 'skills'
  }
);
