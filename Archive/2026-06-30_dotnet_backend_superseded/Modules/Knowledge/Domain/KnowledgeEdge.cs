namespace Apps.Backend.Modules.Knowledge.Domain;

public class KnowledgeEdge
{
    public Guid KnowledgeEdgeId { get; set; } = Guid.NewGuid();
    public Guid LearnerId { get; set; }
    public Guid FromKnowledgeNodeId { get; set; }
    public Guid ToKnowledgeNodeId { get; set; }
    public string RelationType { get; set; } = "directed";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
