import { DiscoveryPlannerService } from '../../../discovery-planner/application/services/discovery-planner.service';
import { EvidencePlannerService } from '../../../evidence-planner/application/services/evidence-planner.service';
import { KnowledgePlannerService } from '../../../knowledge-planner/application/services/knowledge-planner.service';
import { MissionPlannerService } from '../../../mission-planner/application/services/mission-planner.service';
import { TeachingPlannerService } from '../../../teaching-planner/application/services/teaching-planner.service';
import { PlannerAdapterService } from '../planner-adapter.service';

const baseRequest = {
  userId: 'user-1',
  goalId: 'goal-1',
  sessionId: 'session-1',
  traceId: 'trace-1',
};

describe('PlannerAdapterService', () => {
  let missionPlannerService: jest.Mocked<Pick<MissionPlannerService, 'generateTodaysMission'>>;
  let discoveryPlannerService: jest.Mocked<Pick<DiscoveryPlannerService, 'discoverInitialFocus'>>;
  let knowledgePlannerService: jest.Mocked<Pick<KnowledgePlannerService, 'recommendKnowledge'>>;
  let evidencePlannerService: jest.Mocked<Pick<EvidencePlannerService, 'planEvidence'>>;
  let teachingPlannerService: jest.Mocked<Pick<TeachingPlannerService, 'planTeaching'>>;
  let adapter: PlannerAdapterService;

  beforeEach(() => {
    missionPlannerService = { generateTodaysMission: jest.fn().mockResolvedValue({ marker: 'mission' }) };
    discoveryPlannerService = { discoverInitialFocus: jest.fn().mockResolvedValue({ marker: 'discovery' }) };
    knowledgePlannerService = { recommendKnowledge: jest.fn().mockResolvedValue({ marker: 'knowledge' }) };
    evidencePlannerService = { planEvidence: jest.fn().mockResolvedValue({ marker: 'evidence' }) };
    teachingPlannerService = { planTeaching: jest.fn().mockResolvedValue({ marker: 'teaching' }) };

    adapter = new PlannerAdapterService(
      missionPlannerService as unknown as MissionPlannerService,
      discoveryPlannerService as unknown as DiscoveryPlannerService,
      knowledgePlannerService as unknown as KnowledgePlannerService,
      evidencePlannerService as unknown as EvidencePlannerService,
      teachingPlannerService as unknown as TeachingPlannerService,
    );
  });

  it('routes mission_planner to MissionPlannerService.generateTodaysMission', async () => {
    const response = await adapter.execute('mission_planner', baseRequest);
    expect(missionPlannerService.generateTodaysMission).toHaveBeenCalledWith(baseRequest);
    expect(response).toEqual({ marker: 'mission' });
  });

  it('routes discovery_planner to DiscoveryPlannerService.discoverInitialFocus', async () => {
    await adapter.execute('discovery_planner', baseRequest);
    expect(discoveryPlannerService.discoverInitialFocus).toHaveBeenCalledWith(baseRequest);
  });

  it('routes knowledge_planner to KnowledgePlannerService.recommendKnowledge', async () => {
    await adapter.execute('knowledge_planner', baseRequest);
    expect(knowledgePlannerService.recommendKnowledge).toHaveBeenCalledWith(baseRequest);
  });

  it('routes evidence_planner to EvidencePlannerService.planEvidence', async () => {
    await adapter.execute('evidence_planner', baseRequest);
    expect(evidencePlannerService.planEvidence).toHaveBeenCalledWith(baseRequest);
  });

  it('routes teaching_planner to TeachingPlannerService.planTeaching', async () => {
    await adapter.execute('teaching_planner', baseRequest);
    expect(teachingPlannerService.planTeaching).toHaveBeenCalledWith(baseRequest);
  });

  it('propagates planner rejections to the caller', async () => {
    missionPlannerService.generateTodaysMission.mockRejectedValue(new Error('llm down'));
    await expect(adapter.execute('mission_planner', baseRequest)).rejects.toThrow('llm down');
  });
});
