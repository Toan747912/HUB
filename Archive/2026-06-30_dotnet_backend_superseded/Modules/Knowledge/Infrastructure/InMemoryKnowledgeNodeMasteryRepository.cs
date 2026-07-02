using Apps.Backend.Modules.Knowledge.Application;
using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Infrastructure;

public class InMemoryKnowledgeNodeMasteryRepository : IKnowledgeNodeMasteryRepository
{
    private static readonly List<KnowledgeNodeMastery> Store = new();

    public Task AddAsync(KnowledgeNodeMastery mastery, CancellationToken cancellationToken = default)
    {
        Store.Add(mastery);
        return Task.CompletedTask;
    }
}
