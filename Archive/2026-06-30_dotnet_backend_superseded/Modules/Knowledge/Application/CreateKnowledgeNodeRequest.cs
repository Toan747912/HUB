namespace Apps.Backend.Modules.Knowledge.Application;

public class CreateKnowledgeNodeRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
}
