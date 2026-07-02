using Apps.Backend.Modules.Evidence.Domain;
using Apps.Backend.Modules.Identity.Application;

namespace Apps.Backend.Modules.Evidence.Application;

public class EvidenceService : IEvidenceService
{
    private readonly IEvidenceRepository _evidenceRepository;
    private readonly IEvidenceLinkRepository _evidenceLinkRepository;
    private readonly ICurrentUserService _currentUserService;

    public EvidenceService(
        IEvidenceRepository evidenceRepository,
        IEvidenceLinkRepository evidenceLinkRepository,
        ICurrentUserService currentUserService)
    {
        _evidenceRepository = evidenceRepository;
        _evidenceLinkRepository = evidenceLinkRepository;
        _currentUserService = currentUserService;
    }

    public async Task<EvidenceResponse> CreateEvidenceAsync(CreateEvidenceRequest request, CancellationToken cancellationToken = default)
    {
        var learnerId = GetAuthenticatedLearnerId();

        if (request.LearningSessionId == Guid.Empty)
        {
            throw new ArgumentException("LearningSessionId is required.");
        }

        if (string.IsNullOrWhiteSpace(request.EvidenceType))
        {
            throw new ArgumentException("EvidenceType is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Payload))
        {
            throw new ArgumentException("Payload is required.");
        }

        var evidence = new EvidenceRecord
        {
            EvidenceId = Guid.NewGuid(),
            LearnerId = learnerId,
            LearningSessionId = request.LearningSessionId,
            EvidenceType = request.EvidenceType.Trim(),
            Payload = request.Payload,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _evidenceRepository.AddAsync(evidence, cancellationToken);

        var knowledgeNodeIds = request.KnowledgeNodeIds
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToList();

        if (knowledgeNodeIds.Count > 0)
        {
            var links = knowledgeNodeIds.Select(nodeId => new EvidenceLink
            {
                EvidenceLinkId = Guid.NewGuid(),
                LearnerId = learnerId,
                EvidenceId = evidence.EvidenceId,
                KnowledgeNodeId = nodeId,
                CreatedAtUtc = DateTime.UtcNow
            });

            await _evidenceLinkRepository.AddRangeAsync(links, cancellationToken);
        }

        return new EvidenceResponse
        {
            EvidenceId = evidence.EvidenceId,
            LearningSessionId = evidence.LearningSessionId,
            EvidenceType = evidence.EvidenceType,
            Payload = evidence.Payload,
            CreatedAtUtc = evidence.CreatedAtUtc,
            KnowledgeNodeIds = knowledgeNodeIds
        };
    }

    public async Task<IReadOnlyList<EvidenceResponse>> GetEvidenceBySessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var learnerId = GetAuthenticatedLearnerId();

        if (sessionId == Guid.Empty)
        {
            throw new ArgumentException("sessionId is required.");
        }

        var evidenceList = await _evidenceRepository.GetBySessionAsync(learnerId, sessionId, cancellationToken);
        var evidenceIds = evidenceList.Select(x => x.EvidenceId).ToList();
        var links = await _evidenceLinkRepository.GetByEvidenceIdsAsync(learnerId, evidenceIds, cancellationToken);

        var map = links
            .GroupBy(x => x.EvidenceId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.KnowledgeNodeId).ToList());

        return evidenceList
            .Select(e => new EvidenceResponse
            {
                EvidenceId = e.EvidenceId,
                LearningSessionId = e.LearningSessionId,
                EvidenceType = e.EvidenceType,
                Payload = e.Payload,
                CreatedAtUtc = e.CreatedAtUtc,
                KnowledgeNodeIds = map.TryGetValue(e.EvidenceId, out var ids) ? ids : new List<Guid>()
            })
            .ToList();
    }

    private Guid GetAuthenticatedLearnerId()
    {
        if (!_currentUserService.IsAuthenticated || string.IsNullOrWhiteSpace(_currentUserService.UserId))
        {
            throw new UnauthorizedAccessException("Unauthorized.");
        }

        if (!Guid.TryParse(_currentUserService.UserId, out var learnerId))
        {
            throw new ArgumentException("Invalid authenticated user id.");
        }

        return learnerId;
    }
}
