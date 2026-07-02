using Apps.Backend.Modules.Evidence.Application;
using Apps.Backend.Modules.Identity.Application;
using Apps.Backend.Modules.Assessment.Domain;

namespace Apps.Backend.Modules.Assessment.Application;

public class AssessmentService : IAssessmentService
{
    private readonly IAssessmentResultRepository _assessmentResultRepository;
    private readonly IEvidenceService _evidenceService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISessionOwnershipChecker _sessionOwnershipChecker;

    public AssessmentService(
        IAssessmentResultRepository assessmentResultRepository,
        IEvidenceService evidenceService,
        ICurrentUserService currentUserService,
        ISessionOwnershipChecker sessionOwnershipChecker)
    {
        _assessmentResultRepository = assessmentResultRepository;
        _evidenceService = evidenceService;
        _currentUserService = currentUserService;
        _sessionOwnershipChecker = sessionOwnershipChecker;
    }

    public async Task<AssessmentResponse> RunAsync(Guid sessionId, CancellationToken cancellationToken = default)
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

        var evidence = await _evidenceService.GetEvidenceBySessionAsync(sessionId, cancellationToken);
        var evidenceCount = evidence.Count;
        var knowledgeLinks = evidence.Sum(x => x.KnowledgeNodeIds.Count);

        var raw = (evidenceCount * 20m) + (knowledgeLinks * 5m);
        var score = Math.Min(100m, raw);

        var level = score switch
        {
            < 40m => "low",
            < 70m => "medium",
            _ => "high"
        };

        var record = new AssessmentResultRecord
        {
            AssessmentResultId = Guid.NewGuid(),
            LearnerId = learnerId,
            LearningSessionId = sessionId,
            Score = score,
            Level = level,
            Summary = $"Rule-based assessment from evidence={evidenceCount}, links={knowledgeLinks}.",
            CreatedAtUtc = DateTime.UtcNow
        };

        await _assessmentResultRepository.AddAsync(record, cancellationToken);

        return ToResponse(record);
    }

    public async Task<IReadOnlyList<AssessmentResponse>> GetBySessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
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

        var rows = await _assessmentResultRepository.GetBySessionAsync(learnerId, sessionId, cancellationToken);
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

    private static AssessmentResponse ToResponse(AssessmentResultRecord row) => new()
    {
        AssessmentResultId = row.AssessmentResultId,
        LearningSessionId = row.LearningSessionId,
        Score = row.Score,
        Level = row.Level,
        Summary = row.Summary,
        CreatedAtUtc = row.CreatedAtUtc
    };
}
