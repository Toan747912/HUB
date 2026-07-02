namespace Apps.Backend.Modules.Intervention.Application;

public interface IInterventionService
{
    Task<InterventionResponse> ApplyAsync(Guid recommendationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InterventionResponse>> GetBySessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
}
