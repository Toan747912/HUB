using Apps.Backend.Modules.Knowledge.Application;
using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Infrastructure;

public class InMemoryKnowledgeEdgeRepository : IKnowledgeEdgeRepository
{
    private static readonly List<KnowledgeEdge> Store = new();

    public Task AddAsync(KnowledgeEdge edge, CancellationToken cancellationToken = default)
    {
        Store.Add(edge);
        return Task.CompletedTask;
    }
}
