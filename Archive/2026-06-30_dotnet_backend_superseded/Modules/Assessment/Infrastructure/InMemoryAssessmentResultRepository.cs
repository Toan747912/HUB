using Apps.Backend.Modules.Assessment.Application;
using Apps.Backend.Modules.Assessment.Domain;

namespace Apps.Backend.Modules.Assessment.Infrastructure;

public class InMemoryAssessmentResultRepository : IAssessmentResultRepository
{
    private static readonly List<AssessmentResultRecord> Store = new();

    public Task AddAsync(AssessmentResultRecord record, CancellationToken cancellationToken = default)
    {
        Store.Add(record);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<AssessmentResultRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        var rows = Store
            .Where(x => x.LearnerId == learnerId && x.LearningSessionId == sessionId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToList();

        return Task.FromResult((IReadOnlyList<AssessmentResultRecord>)rows);
    }
}
