using Apps.Backend.Modules.Evidence.Application;
using Apps.Backend.Modules.Evidence.Domain;

namespace Apps.Backend.Modules.Evidence.Infrastructure;

public class InMemoryEvidenceRepository : IEvidenceRepository
{
    private static readonly List<EvidenceRecord> Store = new();

    public Task AddAsync(EvidenceRecord evidence, CancellationToken cancellationToken = default)
    {
        Store.Add(evidence);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<EvidenceRecord>> GetBySessionAsync(Guid learnerId, Guid learningSessionId, CancellationToken cancellationToken = default)
    {
        var items = Store
            .Where(x => x.LearnerId == learnerId && x.LearningSessionId == learningSessionId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToList();

        return Task.FromResult((IReadOnlyList<EvidenceRecord>)items);
    }

    public Task<EvidenceRecord?> GetByIdAsync(Guid learnerId, Guid evidenceId, CancellationToken cancellationToken = default)
    {
        var item = Store.FirstOrDefault(x => x.LearnerId == learnerId && x.EvidenceId == evidenceId);
        return Task.FromResult(item);
    }
}
