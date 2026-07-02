using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Application;

public interface IKnowledgeEdgeRepository
{
    Task AddAsync(KnowledgeEdge edge, CancellationToken cancellationToken = default);
}
