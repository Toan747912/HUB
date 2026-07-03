import { MockLlmClientService } from '../../llm/mock-llm-client.service';
import { RedisCircuitBreakerService } from '../../resilience/redis-circuit-breaker.service';
import { ResilientLlmGateway } from '../resilient-llm-gateway.service';

describe('ResilientLlmGateway', () => {
  function build() {
    const llmClient = { complete: jest.fn() } as unknown as jest.Mocked<MockLlmClientService>;
    const circuitBreaker = {
      canExecute: jest.fn().mockResolvedValue(true),
      onSuccess: jest.fn().mockResolvedValue(undefined),
      onFailure: jest.fn().mockResolvedValue(undefined),
      getState: jest.fn(),
    } as unknown as jest.Mocked<RedisCircuitBreakerService>;

    const gateway = new ResilientLlmGateway(llmClient, circuitBreaker);
    return { gateway, llmClient, circuitBreaker };
  }

  it('returns the raw LLM output and marks success on the breaker when the call succeeds', async () => {
    const { gateway, llmClient, circuitBreaker } = build();
    llmClient.complete.mockResolvedValue({ tasks: [] });

    const result = await gateway.complete({
      capability: 'mission_planner',
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      prompt: 'p',
      promptVersion: 'v1',
    });

    expect(result).toEqual({
      raw: { tasks: [] },
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      fallbackUsed: false,
    });
    expect(circuitBreaker.onSuccess).toHaveBeenCalledWith('llm:mission_planner:mock-llm');
    expect(circuitBreaker.onFailure).not.toHaveBeenCalled();
  });

  it('isolates the breaker key by capability and provider', async () => {
    const { gateway, llmClient, circuitBreaker } = build();
    llmClient.complete.mockResolvedValue({});

    await gateway.complete({
      capability: 'mission_planner',
      provider: 'provider-a',
      model: 'm',
      prompt: 'p',
      promptVersion: 'v1',
    });
    await gateway.complete({
      capability: 'other_capability',
      provider: 'provider-a',
      model: 'm',
      prompt: 'p',
      promptVersion: 'v1',
    });

    expect(circuitBreaker.canExecute).toHaveBeenCalledWith('llm:mission_planner:provider-a');
    expect(circuitBreaker.canExecute).toHaveBeenCalledWith('llm:other_capability:provider-a');
  });

  it('falls back and records a failure when the LLM call rejects', async () => {
    const { gateway, llmClient, circuitBreaker } = build();
    llmClient.complete.mockRejectedValue(new Error('boom'));

    const result = await gateway.complete({
      capability: 'mission_planner',
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      prompt: 'p',
      promptVersion: 'v1',
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('llm_unavailable_or_timeout');
    expect(result.raw).toBeNull();
    expect(circuitBreaker.onFailure).toHaveBeenCalledWith('llm:mission_planner:mock-llm');
  });

  it('falls back on timeout without waiting for the LLM call to settle', async () => {
    const { gateway, llmClient } = build();
    llmClient.complete.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 50)),
    );

    const result = await gateway.complete({
      capability: 'mission_planner',
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      prompt: 'p',
      promptVersion: 'v1',
      timeoutMs: 5,
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('llm_unavailable_or_timeout');
  });

  it('falls back immediately without calling the LLM when the circuit is open', async () => {
    const { gateway, llmClient, circuitBreaker } = build();
    circuitBreaker.canExecute.mockResolvedValue(false);

    const result = await gateway.complete({
      capability: 'mission_planner',
      provider: 'mock-llm',
      model: 'mock-llm-v1',
      prompt: 'p',
      promptVersion: 'v1',
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe('circuit_open');
    expect(llmClient.complete).not.toHaveBeenCalled();
  });
});
