using Apps.Backend.Modules.Knowledge.Application;
using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Infrastructure;

public class InMemoryKnowledgeNodeRepository : IKnowledgeNodeRepository
{
    private static readonly List<KnowledgeNode> Store = new();

    public Task AddAsync(KnowledgeNode node, CancellationToken cancellationToken = default)
    {
        Store.Add(node);
        return Task.CompletedTask;
    }

    public Task<KnowledgeNode?> GetByIdAsync(Guid knowledgeNodeId, Guid learnerId, CancellationToken cancellationToken = default)
    {
        var item = Store.FirstOrDefault(x => x.KnowledgeNodeId == knowledgeNodeId && x.LearnerId == learnerId);
        return Task.FromResult(item);
    }
}
