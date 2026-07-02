using Apps.Backend.Modules.Evidence.Application;
using Apps.Backend.Modules.Evidence.Domain;

namespace Apps.Backend.Modules.Evidence.Infrastructure;

public class InMemoryEvidenceLinkRepository : IEvidenceLinkRepository
{
    private static readonly List<EvidenceLink> Store = new();

    public Task AddRangeAsync(IEnumerable<EvidenceLink> links, CancellationToken cancellationToken = default)
    {
        Store.AddRange(links);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<EvidenceLink>> GetByEvidenceIdsAsync(Guid learnerId, IEnumerable<Guid> evidenceIds, CancellationToken cancellationToken = default)
    {
        var idSet = evidenceIds.ToHashSet();

        var items = Store
            .Where(x => x.LearnerId == learnerId && idSet.Contains(x.EvidenceId))
            .ToList();

        return Task.FromResult((IReadOnlyList<EvidenceLink>)items);
    }
}
