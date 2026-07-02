namespace Apps.Backend.Modules.Knowledge.Application;

public interface IKnowledgeService
{
    Task<KnowledgeNodeResponse> CreateNodeAsync(CreateKnowledgeNodeRequest request, CancellationToken cancellationToken = default);
    Task LinkNodesAsync(LinkKnowledgeNodeRequest request, CancellationToken cancellationToken = default);
    Task<KnowledgeNodeResponse?> GetNodeAsync(Guid knowledgeNodeId, CancellationToken cancellationToken = default);
}
