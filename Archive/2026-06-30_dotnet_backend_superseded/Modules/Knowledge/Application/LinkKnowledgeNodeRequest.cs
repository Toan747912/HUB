namespace Apps.Backend.Modules.Knowledge.Application;

public class LinkKnowledgeNodeRequest
{
    public Guid FromKnowledgeNodeId { get; set; }
    public Guid ToKnowledgeNodeId { get; set; }
    public string RelationType { get; set; } = "directed";
}
