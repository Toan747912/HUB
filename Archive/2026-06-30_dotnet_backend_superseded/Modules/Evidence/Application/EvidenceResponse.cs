namespace Apps.Backend.Modules.Evidence.Application;

public class EvidenceResponse
{
    public Guid EvidenceId { get; set; }
    public Guid LearningSessionId { get; set; }
    public string EvidenceType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
    public List<Guid> KnowledgeNodeIds { get; set; } = new();
}
