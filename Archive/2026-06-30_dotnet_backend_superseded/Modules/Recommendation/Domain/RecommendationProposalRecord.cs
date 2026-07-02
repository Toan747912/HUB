namespace Apps.Backend.Modules.Recommendation.Domain;

public class RecommendationProposalRecord
{
    public Guid RecommendationProposalId { get; set; }
    public Guid LearnerId { get; set; }
    public Guid LearningSessionId { get; set; }
    public string RecommendationType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public List<Guid> KnowledgeNodeIds { get; set; } = new();
    public DateTime CreatedAtUtc { get; set; }
}
