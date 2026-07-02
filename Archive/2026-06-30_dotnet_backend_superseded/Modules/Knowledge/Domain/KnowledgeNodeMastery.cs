namespace Apps.Backend.Modules.Knowledge.Domain;

public class KnowledgeNodeMastery
{
    public Guid KnowledgeNodeMasteryId { get; set; } = Guid.NewGuid();
    public Guid LearnerId { get; set; }
    public Guid KnowledgeNodeId { get; set; }
    public decimal MasteryScore { get; set; }
    public DateTime RecordedAtUtc { get; set; } = DateTime.UtcNow;
}
