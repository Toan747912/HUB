using Apps.Backend.Modules.Recommendation.Domain;

namespace Apps.Backend.Modules.Recommendation.Application;

public interface IRecommendationRepository
{
    Task AddAsync(RecommendationProposalRecord record, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecommendationProposalRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<RecommendationProposalRecord?> GetByIdAsync(Guid learnerId, Guid recommendationId, CancellationToken cancellationToken = default);
}
