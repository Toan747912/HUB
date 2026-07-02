namespace Apps.Backend.Modules.Intervention.Domain;

public class InterventionRecord
{
    public Guid InterventionId { get; set; }
    public Guid LearnerId { get; set; }
    public Guid RecommendationProposalId { get; set; }
    public Guid LearningSessionId { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
