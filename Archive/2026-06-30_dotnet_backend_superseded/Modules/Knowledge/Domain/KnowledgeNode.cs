namespace Apps.Backend.Modules.Knowledge.Domain;

public class KnowledgeNode
{
    public Guid KnowledgeNodeId { get; set; } = Guid.NewGuid();
    public Guid LearnerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
