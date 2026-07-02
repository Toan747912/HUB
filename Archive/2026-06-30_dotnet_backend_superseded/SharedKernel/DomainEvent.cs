namespace Apps.Backend.SharedKernel;

public abstract class DomainEvent
{
    public DateTime OccurredAtUtc { get; } = DateTime.UtcNow;
}
