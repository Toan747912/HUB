using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Application;

public interface IKnowledgeNodeMasteryRepository
{
    Task AddAsync(KnowledgeNodeMastery mastery, CancellationToken cancellationToken = default);
}
