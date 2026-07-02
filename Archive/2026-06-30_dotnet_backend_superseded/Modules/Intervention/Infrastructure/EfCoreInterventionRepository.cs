using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Intervention.Application;
using Apps.Backend.Modules.Intervention.Domain;
using Microsoft.EntityFrameworkCore;

namespace Apps.Backend.Modules.Intervention.Infrastructure;

public class EfCoreInterventionRepository : IInterventionRepository
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreInterventionRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(InterventionRecord record, CancellationToken cancellationToken = default)
    {
        await _dbContext.Interventions.AddAsync(record, cancellationToken);
    }

    public async Task<IReadOnlyList<InterventionRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Interventions
            .AsNoTracking()
            .Where(x => x.LearnerId == learnerId && x.LearningSessionId == sessionId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }
}
