using Apps.Backend.Modules.Assessment.Domain;

namespace Apps.Backend.Modules.Assessment.Application;

public interface IAssessmentResultRepository
{
    Task AddAsync(AssessmentResultRecord record, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AssessmentResultRecord>> GetBySessionAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default);
}
