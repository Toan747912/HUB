using Apps.Backend.Modules.Evidence.Domain;

namespace Apps.Backend.Modules.Evidence.Application;

public interface IEvidenceLinkRepository
{
    Task AddRangeAsync(IEnumerable<EvidenceLink> links, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EvidenceLink>> GetByEvidenceIdsAsync(Guid learnerId, IEnumerable<Guid> evidenceIds, CancellationToken cancellationToken = default);
}
