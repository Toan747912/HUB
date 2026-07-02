using Apps.Backend.Modules.Assessment.Application;
using Apps.Backend.Modules.Evidence.Application;
using Apps.Backend.Modules.Identity.Application;
using Apps.Backend.Modules.Recommendation.Domain;

namespace Apps.Backend.Modules.Recommendation.Application;

public class RecommendationService : IRecommendationService
{
    private readonly IRecommendationRepository _recommendationRepository;
    private readonly IAssessmentService _assessmentService;
    private readonly IEvidenceService _evidenceService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISessionOwnershipChecker _sessionOwnershipChecker;

    public RecommendationService(
        IRecommendationRepository recommendationRepository,
        IAssessmentService assessmentService,
        IEvidenceService evidenceService,
        ICurrentUserService currentUserService,
        ISessionOwnershipChecker sessionOwnershipChecker)
    {
        _recommendationRepository = recommendationRepository;
        _assessmentService = assessmentService;
        _evidenceService = evidenceService;
        _currentUserService = currentUserService;
        _sessionOwnershipChecker = sessionOwnershipChecker;
    }

    public async Task<RecommendationResponse> GenerateAsync(Guid sessionId, CancellationToken cancellationToken = default)
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

        var assessments = await _assessmentService.GetBySessionAsync(sessionId, cancellationToken);
        var latestAssessment = assessments.OrderByDescending(x => x.CreatedAtUtc).FirstOrDefault();

        var evidenceRows = await _evidenceService.GetEvidenceBySessionAsync(sessionId, cancellationToken);
        var nodeIds = evidenceRows
            .SelectMany(x => x.KnowledgeNodeIds)
            .Distinct()
            .Take(5)
            .ToList();

        var type = "reinforcement";
        var message = "Continue current path.";

        if (latestAssessment is null || latestAssessment.Score < 40m)
        {
            type = "foundational";
            message = "Focus on core prerequisites and short guided practice.";
        }
        else if (latestAssessment.Score < 70m)
        {
            type = "targeted";
            message = "Practice targeted knowledge gaps with spaced repetition.";
        }

        var record = new RecommendationProposalRecord
        {
            RecommendationProposalId = Guid.NewGuid(),
            LearnerId = learnerId,
            LearningSessionId = sessionId,
            RecommendationType = type,
            Message = message,
            KnowledgeNodeIds = nodeIds,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _recommendationRepository.AddAsync(record, cancellationToken);

        return ToResponse(record);
    }

    public async Task<IReadOnlyList<RecommendationResponse>> GetBySessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
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

        var rows = await _recommendationRepository.GetBySessionAsync(learnerId, sessionId, cancellationToken);
        return rows.Select(ToResponse).ToList();
    }

    public async Task<RecommendationResponse?> GetByIdAsync(Guid recommendationId, CancellationToken cancellationToken = default)
    {
        var learnerId = GetLearnerId();

        if (recommendationId == Guid.Empty)
        {
            throw new ArgumentException("recommendationId is required.");
        }

        var row = await _recommendationRepository.GetByIdAsync(learnerId, recommendationId, cancellationToken);
        return row is null ? null : ToResponse(row);
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

    private static RecommendationResponse ToResponse(RecommendationProposalRecord row) => new()
    {
        RecommendationProposalId = row.RecommendationProposalId,
        LearningSessionId = row.LearningSessionId,
        RecommendationType = row.RecommendationType,
        Message = row.Message,
        KnowledgeNodeIds = row.KnowledgeNodeIds,
        CreatedAtUtc = row.CreatedAtUtc
    };
}
