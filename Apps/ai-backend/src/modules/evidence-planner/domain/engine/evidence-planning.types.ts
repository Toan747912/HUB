export interface EvidenceRequirement {
  evidenceType: string;
  description: string;
  rationale: string;
}

export interface EvidencePlan {
  evidenceId: string;
  userId: string;
  requirements: EvidenceRequirement[];
  primaryRequirement: string;
  focusSummary: string;
}
