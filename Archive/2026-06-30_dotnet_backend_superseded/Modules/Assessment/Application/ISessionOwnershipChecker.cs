namespace Apps.Backend.Modules.Assessment.Application;

public interface ISessionOwnershipChecker
{
    Task<bool> ExistsForLearnerAsync(Guid learnerId, Guid sessionId, CancellationToken cancellationToken = default);
}
