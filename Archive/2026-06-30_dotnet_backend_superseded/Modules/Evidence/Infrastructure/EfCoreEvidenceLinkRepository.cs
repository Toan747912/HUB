using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Evidence.Application;
using Apps.Backend.Modules.Evidence.Domain;
using Microsoft.EntityFrameworkCore;

namespace Apps.Backend.Modules.Evidence.Infrastructure;

public class EfCoreEvidenceLinkRepository : IEvidenceLinkRepository
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreEvidenceLinkRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddRangeAsync(IEnumerable<EvidenceLink> links, CancellationToken cancellationToken = default)
    {
        await _dbContext.EvidenceLinks.AddRangeAsync(links, cancellationToken);
    }

    public async Task<IReadOnlyList<EvidenceLink>> GetByEvidenceIdsAsync(Guid learnerId, IEnumerable<Guid> evidenceIds, CancellationToken cancellationToken = default)
    {
        var evidenceIdSet = evidenceIds.ToList();

        return await _dbContext.EvidenceLinks
            .AsNoTracking()
            .Where(x => x.LearnerId == learnerId && evidenceIdSet.Contains(x.SourceEvidenceId))
            .ToListAsync(cancellationToken);
    }
}
