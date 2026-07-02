namespace Apps.Backend.Modules.Knowledge.Application;

public class KnowledgeNodeResponse
{
    public Guid KnowledgeNodeId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
}
