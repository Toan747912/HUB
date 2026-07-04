export interface DiscoverySuggestion {
  goalArea: string;
  skillFocus: string;
  rationale: string;
}

export interface DiscoveryPlan {
  discoveryId: string;
  userId: string;
  suggestions: DiscoverySuggestion[];
  primaryFocus: string;
  focusSummary: string;
}
