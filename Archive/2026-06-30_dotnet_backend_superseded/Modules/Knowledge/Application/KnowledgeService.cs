using Apps.Backend.Modules.Identity.Application;
using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Application;

public class KnowledgeService : IKnowledgeService
{
    private readonly IKnowledgeNodeRepository _knowledgeNodeRepository;
    private readonly IKnowledgeEdgeRepository _knowledgeEdgeRepository;
    private readonly IKnowledgeNodeMasteryRepository _knowledgeNodeMasteryRepository;
    private readonly ICurrentUserService _currentUserService;

    public KnowledgeService(
        IKnowledgeNodeRepository knowledgeNodeRepository,
        IKnowledgeEdgeRepository knowledgeEdgeRepository,
        IKnowledgeNodeMasteryRepository knowledgeNodeMasteryRepository,
        ICurrentUserService currentUserService)
    {
        _knowledgeNodeRepository = knowledgeNodeRepository;
        _knowledgeEdgeRepository = knowledgeEdgeRepository;
        _knowledgeNodeMasteryRepository = knowledgeNodeMasteryRepository;
        _currentUserService = currentUserService;
    }

    public async Task<KnowledgeNodeResponse> CreateNodeAsync(CreateKnowledgeNodeRequest request, CancellationToken cancellationToken = default)
    {
        var learnerId = GetAuthenticatedLearnerId();

        if (string.IsNullOrWhiteSpace(request.Title))
        {
            throw new ArgumentException("Title is required.");
        }

        var node = new KnowledgeNode
        {
            KnowledgeNodeId = Guid.NewGuid(),
            LearnerId = learnerId,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await _knowledgeNodeRepository.AddAsync(node, cancellationToken);

        return new KnowledgeNodeResponse
        {
            KnowledgeNodeId = node.KnowledgeNodeId,
            Title = node.Title,
            Description = node.Description
        };
    }

    public async Task LinkNodesAsync(LinkKnowledgeNodeRequest request, CancellationToken cancellationToken = default)
    {
        var learnerId = GetAuthenticatedLearnerId();

        if (request.FromKnowledgeNodeId == Guid.Empty || request.ToKnowledgeNodeId == Guid.Empty)
        {
            throw new ArgumentException("FromKnowledgeNodeId and ToKnowledgeNodeId are required.");
        }

        if (request.FromKnowledgeNodeId == request.ToKnowledgeNodeId)
        {
            throw new ArgumentException("Directed edge requires different source and target nodes.");
        }

        var fromNode = await _knowledgeNodeRepository.GetByIdAsync(request.FromKnowledgeNodeId, learnerId, cancellationToken);
        var toNode = await _knowledgeNodeRepository.GetByIdAsync(request.ToKnowledgeNodeId, learnerId, cancellationToken);

        if (fromNode is null || toNode is null)
        {
            throw new ArgumentException("Knowledge nodes must exist and belong to current user.");
        }

        var edge = new KnowledgeEdge
        {
            KnowledgeEdgeId = Guid.NewGuid(),
            LearnerId = learnerId,
            FromKnowledgeNodeId = request.FromKnowledgeNodeId,
            ToKnowledgeNodeId = request.ToKnowledgeNodeId,
            RelationType = string.IsNullOrWhiteSpace(request.RelationType) ? "directed" : request.RelationType.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await _knowledgeEdgeRepository.AddAsync(edge, cancellationToken);
    }

    public async Task<KnowledgeNodeResponse?> GetNodeAsync(Guid knowledgeNodeId, CancellationToken cancellationToken = default)
    {
        var learnerId = GetAuthenticatedLearnerId();

        if (knowledgeNodeId == Guid.Empty)
        {
            throw new ArgumentException("Knowledge node id is required.");
        }

        var node = await _knowledgeNodeRepository.GetByIdAsync(knowledgeNodeId, learnerId, cancellationToken);
        if (node is null)
        {
            return null;
        }

        return new KnowledgeNodeResponse
        {
            KnowledgeNodeId = node.KnowledgeNodeId,
            Title = node.Title,
            Description = node.Description
        };
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
