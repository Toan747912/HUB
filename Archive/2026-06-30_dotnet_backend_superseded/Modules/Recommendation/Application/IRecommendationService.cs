namespace Apps.Backend.Modules.Recommendation.Application;

public interface IRecommendationService
{
    Task<RecommendationResponse> GenerateAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RecommendationResponse>> GetBySessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task<RecommendationResponse?> GetByIdAsync(Guid recommendationId, CancellationToken cancellationToken = default);
}
