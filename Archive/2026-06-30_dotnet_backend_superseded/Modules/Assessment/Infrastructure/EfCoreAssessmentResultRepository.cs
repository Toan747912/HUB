using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Assessment.Application;
using Apps.Backend.Modules.Assessment.Domain;
using Microsoft.EntityFrameworkCore;

namespace Apps.Backend.Modules.Assessment.Infrastructure;

public class EfCoreAssessmentResultRepository : IAssessmentResultRepository
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreAssessmentResultRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(AssessmentResultRecord record, CancellationToken cancellationToken = default)
    {
        await _dbContext.AssessmentResults.AddAsync(record, cancellationToken);
    }

    public async Task<IReadOnlyList<AssessmentResultRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.AssessmentResults
            .AsNoTracking()
            .Where(x => x.LearnerId == learnerId && x.LearningSessionId == sessionId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }
}
