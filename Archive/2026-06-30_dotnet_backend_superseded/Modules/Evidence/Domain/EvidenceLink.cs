namespace Apps.Backend.Modules.Evidence.Domain;

public class EvidenceLink
{
    public Guid EvidenceLinkId { get; set; } = Guid.NewGuid();
    public Guid LearnerId { get; set; }
    public Guid EvidenceId { get; set; }
    public Guid KnowledgeNodeId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
