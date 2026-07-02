using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Recommendation.Application;
using Apps.Backend.Modules.Recommendation.Domain;
using Microsoft.EntityFrameworkCore;

namespace Apps.Backend.Modules.Recommendation.Infrastructure;

public class EfCoreRecommendationRepository : IRecommendationRepository
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreRecommendationRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(RecommendationProposalRecord record, CancellationToken cancellationToken = default)
    {
        await _dbContext.RecommendationProposals.AddAsync(record, cancellationToken);
    }

    public async Task<IReadOnlyList<RecommendationProposalRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.RecommendationProposals
            .AsNoTracking()
            .Where(x => x.LearnerId == learnerId && x.LearningSessionId == sessionId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<RecommendationProposalRecord?> GetByIdAsync(Guid learnerId, Guid recommendationId, CancellationToken cancellationToken = default)
    {
        return _dbContext.RecommendationProposals
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.LearnerId == learnerId && x.RecommendationId == recommendationId, cancellationToken);
    }
}
