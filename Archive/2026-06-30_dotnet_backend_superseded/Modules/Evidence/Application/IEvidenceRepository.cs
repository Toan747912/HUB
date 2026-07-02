using Apps.Backend.Modules.Evidence.Domain;

namespace Apps.Backend.Modules.Evidence.Application;

public interface IEvidenceRepository
{
    Task AddAsync(EvidenceRecord evidence, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EvidenceRecord>> GetBySessionAsync(Guid learnerId, Guid learningSessionId, CancellationToken cancellationToken = default);
    Task<EvidenceRecord?> GetByIdAsync(Guid learnerId, Guid evidenceId, CancellationToken cancellationToken = default);
}
