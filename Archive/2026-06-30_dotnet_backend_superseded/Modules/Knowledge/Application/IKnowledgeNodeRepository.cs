using Apps.Backend.Modules.Knowledge.Domain;

namespace Apps.Backend.Modules.Knowledge.Application;

public interface IKnowledgeNodeRepository
{
    Task AddAsync(KnowledgeNode node, CancellationToken cancellationToken = default);
    Task<KnowledgeNode?> GetByIdAsync(Guid knowledgeNodeId, Guid learnerId, CancellationToken cancellationToken = default);
}
