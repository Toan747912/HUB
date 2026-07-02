using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Knowledge.Application;
using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Infrastructure;

public class EfCoreKnowledgeEdgeRepository : IKnowledgeEdgeRepository
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreKnowledgeEdgeRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(KnowledgeEdge edge, CancellationToken cancellationToken = default)
    {
        await _dbContext.KnowledgeEdges.AddAsync(edge, cancellationToken);
    }
}
