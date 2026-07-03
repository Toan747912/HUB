export interface LlmGatewayRequest {
  capability: string;
  provider: string;
  model: string;
  prompt: string;
  promptVersion: string;
  timeoutMs?: number;
}

export interface LlmGatewayResult {
  raw: Record<string, unknown> | null;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}
