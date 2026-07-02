namespace Apps.Backend.Modules.Evidence.Application;

public class CreateEvidenceRequest
{
    public Guid LearningSessionId { get; set; }
    public string EvidenceType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public List<Guid> KnowledgeNodeIds { get; set; } = new();
}
