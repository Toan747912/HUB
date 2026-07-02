using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Knowledge.Application;
using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Infrastructure;

public class EfCoreKnowledgeNodeMasteryRepository : IKnowledgeNodeMasteryRepository
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreKnowledgeNodeMasteryRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(KnowledgeNodeMastery mastery, CancellationToken cancellationToken = default)
    {
        await _dbContext.KnowledgeNodeMasteries.AddAsync(mastery, cancellationToken);
    }
}
