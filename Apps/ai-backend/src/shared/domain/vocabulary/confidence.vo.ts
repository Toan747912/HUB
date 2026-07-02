/**
 * Canonical confidence vocabulary, shared across the assessment and
 * recommendation modules (previously duplicated as ConfidenceScore and
 * RecommendationConfidence). Represents a 0-100 confidence score.
 */
export class Confidence {
  private constructor(private readonly value: number) {}

  static create(value: number): Confidence {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error('CONFIDENCE_INVALID');
    }
    return new Confidence(Math.round(value));
  }

  getValue(): number {
    return this.value;
  }
}
