import { Injectable } from '@nestjs/common';
import { MockLlmClientService } from '../llm/mock-llm-client.service';
import { RedisCircuitBreakerService } from '../resilience/redis-circuit-breaker.service';
import { LlmGatewayRequest, LlmGatewayResult } from './resilient-llm-gateway.types';

/**
 * Only path any AI capability may use to reach an LLM provider. Wraps every
 * call with a timeout and a circuit breaker keyed by (capability, provider) so
 * one capability's provider outage cannot trip breakers for another.
 */
@Injectable()
export class ResilientLlmGateway {
  private readonly defaultTimeoutMs = 8_000;

  constructor(
    private readonly llmClient: MockLlmClientService,
    private readonly circuitBreaker: RedisCircuitBreakerService,
  ) {}

  async complete(request: LlmGatewayRequest): Promise<LlmGatewayResult> {
    const breakerKey = this.breakerKey(request.capability, request.provider);
    const { provider, model } = request;

    const canExecute = await this.circuitBreaker.canExecute(breakerKey);
    if (!canExecute) {
      return this.fallback(provider, model, 'circuit_open');
    }

    try {
      const raw = await this.withTimeout(
        this.llmClient.complete(request.prompt),
        request.timeoutMs ?? this.defaultTimeoutMs,
      );
      await this.circuitBreaker.onSuccess(breakerKey);
      return { raw, provider, model, fallbackUsed: false };
    } catch {
      await this.circuitBreaker.onFailure(breakerKey);
      return this.fallback(provider, model, 'llm_unavailable_or_timeout');
    }
  }

  private fallback(provider: string, model: string, reason: string): LlmGatewayResult {
    return { raw: null, provider, model, fallbackUsed: true, fallbackReason: reason };
  }

  private breakerKey(capability: string, provider: string): string {
    return `llm:${capability}:${provider}`;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutRef: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutRef = setTimeout(() => reject(new Error('LLM_TIMEOUT')), timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutRef) clearTimeout(timeoutRef);
    }
  }
}
