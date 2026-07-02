using Apps.Backend.Modules.Identity.Application;
using Apps.Backend.Modules.Intervention.Domain;
using Apps.Backend.Modules.Recommendation.Application;

namespace Apps.Backend.Modules.Intervention.Application;

public class InterventionService : IInterventionService
{
    private readonly IInterventionRepository _interventionRepository;
    private readonly IRecommendationService _recommendationService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISessionOwnershipChecker _sessionOwnershipChecker;

    public InterventionService(
        IInterventionRepository interventionRepository,
        IRecommendationService recommendationService,
        ICurrentUserService currentUserService,
        ISessionOwnershipChecker sessionOwnershipChecker)
    {
        _interventionRepository = interventionRepository;
        _recommendationService = recommendationService;
        _currentUserService = currentUserService;
        _sessionOwnershipChecker = sessionOwnershipChecker;
    }

    public async Task<InterventionResponse> ApplyAsync(Guid recommendationId, CancellationToken cancellationToken = default)
    {
        var learnerId = GetLearnerId();

        if (recommendationId == Guid.Empty)
        {
            throw new ArgumentException("recommendationId is required.");
        }

        var recommendation = await _recommendationService.GetByIdAsync(recommendationId, cancellationToken);
        if (recommendation is null)
        {
            throw new KeyNotFoundException("Recommendation not found.");
        }

        var ownsSession = await _sessionOwnershipChecker.ExistsForLearnerAsync(learnerId, recommendation.LearningSessionId, cancellationToken);
        if (!ownsSession)
        {
            throw new KeyNotFoundException("Session not found.");
        }

        var actionType = recommendation.RecommendationType switch
        {
            "foundational" => "guided_practice",
            "targeted" => "gap_reinforcement",
            _ => "continue_plan"
        };

        var record = new InterventionRecord
        {
            InterventionId = Guid.NewGuid(),
            LearnerId = learnerId,
            RecommendationProposalId = recommendation.RecommendationProposalId,
            LearningSessionId = recommendation.LearningSessionId,
            ActionType = actionType,
            Message = $"Applied intervention from recommendation: {recommendation.Message}",
            CreatedAtUtc = DateTime.UtcNow
        };

        await _interventionRepository.AddAsync(record, cancellationToken);

        return ToResponse(record);
    }

    public async Task<IReadOnlyList<InterventionResponse>> GetBySessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var learnerId = GetLearnerId();

        if (sessionId == Guid.Empty)
        {
            throw new ArgumentException("sessionId is required.");
        }

        var ownsSession = await _sessionOwnershipChecker.ExistsForLearnerAsync(learnerId, sessionId, cancellationToken);
        if (!ownsSession)
        {
            throw new KeyNotFoundException("Session not found.");
        }

        var rows = await _interventionRepository.GetBySessionAsync(learnerId, sessionId, cancellationToken);
        return rows.Select(ToResponse).ToList();
    }

    private Guid GetLearnerId()
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

    private static InterventionResponse ToResponse(InterventionRecord row) => new()
    {
        InterventionId = row.InterventionId,
        RecommendationProposalId = row.RecommendationProposalId,
        LearningSessionId = row.LearningSessionId,
        ActionType = row.ActionType,
        Message = row.Message,
        CreatedAtUtc = row.CreatedAtUtc
    };
}
