using Apps.Backend.Modules.Intervention.Application;
using Apps.Backend.Modules.Intervention.Domain;

namespace Apps.Backend.Modules.Intervention.Infrastructure;

public class InMemoryInterventionRepository : IInterventionRepository
{
    private static readonly List<InterventionRecord> Store = new();

    public Task AddAsync(InterventionRecord record, CancellationToken cancellationToken = default)
    {
        Store.Add(record);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<InterventionRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var rows = Store
            .Where(x => x.LearnerId == learnerId && x.LearningSessionId == sessionId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToList();

        return Task.FromResult((IReadOnlyList<InterventionRecord>)rows);
    }
}
