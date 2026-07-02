namespace Apps.Backend.Modules.Assessment.Application;

public interface IAssessmentService
{
    Task<AssessmentResponse> RunAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AssessmentResponse>> GetBySessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
}
