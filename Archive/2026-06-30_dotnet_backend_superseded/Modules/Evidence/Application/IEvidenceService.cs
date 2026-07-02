namespace Apps.Backend.Modules.Evidence.Application;

public interface IEvidenceService
{
    Task<EvidenceResponse> CreateEvidenceAsync(CreateEvidenceRequest request, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<EvidenceResponse>> GetEvidenceBySessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
}
