using Apps.Backend.Modules.Recommendation.Application;
using Apps.Backend.Modules.Recommendation.Domain;

namespace Apps.Backend.Modules.Recommendation.Infrastructure;

public class InMemoryRecommendationRepository : IRecommendationRepository
{
    private static readonly List<RecommendationProposalRecord> Store = new();

    public Task AddAsync(RecommendationProposalRecord record, CancellationToken cancellationToken = default)
    {
        Store.Add(record);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<RecommendationProposalRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var rows = Store
            .Where(x => x.LearnerId == learnerId && x.LearningSessionId == sessionId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToList();

        return Task.FromResult((IReadOnlyList<RecommendationProposalRecord>)rows);
    }

    public Task<RecommendationProposalRecord?> GetByIdAsync(Guid learnerId, Guid recommendationId, CancellationToken cancellationToken = default)
    {
        var row = Store.FirstOrDefault(x => x.LearnerId == learnerId && x.RecommendationProposalId == recommendationId);
        return Task.FromResult(row);
    }
}
