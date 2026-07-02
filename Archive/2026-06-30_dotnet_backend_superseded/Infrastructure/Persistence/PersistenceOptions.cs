namespace Apps.Backend.Infrastructure.Persistence;

public sealed class PersistenceOptions
{
    public const string SectionName = "Persistence";

    public string Mode { get; set; } = nameof(PersistenceMode.InMemory);

    public PersistenceMode GetModeOrDefault()
    {
        return Enum.TryParse<PersistenceMode>(Mode, ignoreCase: true, out var parsed)
            ? parsed
            : PersistenceMode.InMemory;
    }
}
