using Apps.Backend.Infrastructure.Persistence.EfCore;
using Apps.Backend.Modules.Knowledge.Application;
using Apps.Backend.Modules.Knowledge.Domain;
using Microsoft.EntityFrameworkCore;

namespace Apps.Backend.Modules.Knowledge.Infrastructure;

public class EfCoreKnowledgeNodeRepository : IKnowledgeNodeRepository
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreKnowledgeNodeRepository(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(KnowledgeNode node, CancellationToken cancellationToken = default)
    {
        await _dbContext.KnowledgeNodes.AddAsync(node, cancellationToken);
    }

    public Task<KnowledgeNode?> GetByIdAsync(Guid knowledgeNodeId, Guid learnerId, CancellationToken cancellationToken = default)
    {
        return _dbContext.KnowledgeNodes
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.KnowledgeNodeId == knowledgeNodeId && x.LearnerId == learnerId,
                cancellationToken);
    }
}
