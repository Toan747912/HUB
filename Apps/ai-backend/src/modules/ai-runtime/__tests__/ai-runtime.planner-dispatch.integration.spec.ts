import { Test, TestingModule } from '@nestjs/testing';
import { DomainRoute } from '../../../domain/ai.types';
import { AiRuntimeModule } from '../ai-runtime.module';
import { AiRuntimeService } from '../ai-runtime.service';

describe('AiRuntimeService — planner dispatch integration', () => {
  let module: TestingModule;
  let service: AiRuntimeService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        AiRuntimeModule,
      ],
    }).compile();

    service = module.get(AiRuntimeService);
  });

  afterAll(async () => {
    await module.close();
  });

  const routes: DomainRoute[] = [
    'mission_planner',
    'discovery_planner',
    'knowledge_planner',
    'evidence_planner',
    'teaching_planner',
  ];

  it.each(routes)('routes "%s" through the real planner instead of the legacy LLM path', async (route) => {
    const result = await service.execute({
      route,
      input: { prompt: 'user:user-1 goal:goal-1 session:session-1' },
    });

    expect(result.route).toBe(route);
    expect(result.output.route).toBe(route);
    expect(typeof result.output.action).toBe('string');
    expect(result.output.action.length).toBeGreaterThan(0);
    expect(typeof result.output.response).toBe('string');
    expect(result.output.confidence).toBeGreaterThanOrEqual(0);
    expect(result.output.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(result.output.traced_to)).toBe(true);
    expect(result.output.traced_to.length).toBeGreaterThan(0);
    expect(result.context[route]).toBeDefined();
  });
});
