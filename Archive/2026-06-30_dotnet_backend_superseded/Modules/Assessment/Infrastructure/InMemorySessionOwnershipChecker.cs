using Apps.Backend.Modules.Assessment.Application;

namespace Apps.Backend.Modules.Assessment.Infrastructure;

public class InMemorySessionOwnershipChecker : ISessionOwnershipChecker
{
    public Task<bool> ExistsForLearnerAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default)
    {
        // Bootstrap-stage permissive checker.
        // Replace with LearningSession repository-backed ownership validation in next phase.
        var valid = learnerId != Guid.Empty && sessionId != Guid.Empty;
        return Task.FromResult(valid);
    }
}
