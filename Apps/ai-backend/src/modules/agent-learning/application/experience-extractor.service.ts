import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CompletedExecutionInput, Experience, ExperienceArtifact } from '../domain/experience';

/**
 * Step 1 of the learning pipeline: normalizes a completed execution
 * (already flattened by the caller into a CompletedExecutionInput — see
 * domain/experience.ts for why agent-learning does not import the
 * coordinator/collaboration/message-bus modules directly) into an immutable
 * Experience.
 */
@Injectable()
export class ExperienceExtractorService {
  extract(input: CompletedExecutionInput): Experience {
    const startedAt = input.startedAt ?? Date.now();
    const endedAt = input.endedAt ?? startedAt;
    const durationMs = input.durationMs ?? Math.max(0, endedAt - startedAt);

    const artifacts: ExperienceArtifact[] = (input.artifacts ?? []).map((artifact, index) => ({
      artifactId: artifact.artifactId ?? `artifact-${index}`,
      type: artifact.type ?? 'unknown',
      producedBy: artifact.producedBy ?? artifact.agentId ?? 'unknown',
    }));

    return {
      experienceId: randomUUID(),
      workflowId: input.workflowId,
      goal: input.goal,
      sourceType: input.sourceType,
      participants: [...(input.participants ?? [])],
      roles: { ...(input.roles ?? {}) },
      artifacts,
      messages: [...(input.messages ?? [])],
      durationMs,
      success: input.status === 'success',
      confidence: this.clampConfidence(input.confidence),
      errors: [...(input.errors ?? [])],
      consensus: input.consensus ? { ...input.consensus } : undefined,
      plannerCapability: input.plannerCapability,
      capturedAt: Date.now(),
    };
  }

  private clampConfidence(confidence?: number): number {
    if (typeof confidence !== 'number' || Number.isNaN(confidence)) return 0;
    return Math.min(1, Math.max(0, confidence));
  }
}
