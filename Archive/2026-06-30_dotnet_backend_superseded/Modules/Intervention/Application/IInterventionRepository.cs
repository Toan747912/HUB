using Apps.Backend.Modules.Intervention.Domain;

namespace Apps.Backend.Modules.Intervention.Application;

public interface IInterventionRepository
{
    Task AddAsync(InterventionRecord record, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InterventionRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default);
}
