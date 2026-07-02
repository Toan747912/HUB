namespace Apps.Backend.Modules.Evidence.Domain;

public class EvidenceRecord
{
    public Guid EvidenceId { get; set; } = Guid.NewGuid();
    public Guid LearnerId { get; set; }
    public Guid LearningSessionId { get; set; }
    public string EvidenceType { get; set; } = string.Empty;
    public string Payload { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
