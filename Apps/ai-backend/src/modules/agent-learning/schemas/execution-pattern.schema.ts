import { PatternCategory } from '../domain/execution-pattern';

export interface ExecutionPatternDocument {
  _id: string;
  category: PatternCategory;
  subject: string;
  description: string;
  confidence: number;
  evidence: Record<string, unknown>;
  detectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
