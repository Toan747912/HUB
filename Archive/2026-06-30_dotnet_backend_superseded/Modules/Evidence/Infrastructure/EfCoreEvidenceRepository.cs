using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Evidence.Application;
using Apps.Backend.Modules.Evidence.Domain;
using Microsoft.EntityFrameworkCore;

namespace Apps.Backend.Modules.Evidence.Infrastructure;

public class EfCoreEvidenceRepository : IEvidenceRepository
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreEvidenceRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(EvidenceRecord evidence, CancellationToken cancellationToken = default)
    {
        await _dbContext.Evidences.AddAsync(evidence, cancellationToken);
    }

    public async Task<IReadOnlyList<EvidenceRecord>> GetBySessionAsync(Guid learnerId, Guid learningSessionId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Evidences
            .AsNoTracking()
            .Where(x => x.LearnerId == learnerId && x.LearningSessionId == learningSessionId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);
    }

    public Task<EvidenceRecord?> GetByIdAsync(Guid learnerId, Guid evidenceId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Evidences
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.LearnerId == learnerId && x.EvidenceId == evidenceId, cancellationToken);
    }
}
