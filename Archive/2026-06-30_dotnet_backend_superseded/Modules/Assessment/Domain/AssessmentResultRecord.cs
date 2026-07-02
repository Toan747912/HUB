namespace Apps.Backend.Modules.Assessment.Domain;

public class AssessmentResultRecord
{
    public Guid AssessmentResultId { get; set; }
    public Guid LearnerId { get; set; }
    public Guid LearningSessionId { get; set; }
    public decimal Score { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
