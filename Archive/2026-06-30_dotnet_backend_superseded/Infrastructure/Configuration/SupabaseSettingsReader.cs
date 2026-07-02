namespace Apps.Backend.Infrastructure.Configuration;

public class SupabaseSettingsReader
{
    private readonly IConfiguration _configuration;

    public SupabaseSettingsReader(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GetConnectionString()
    {
        return _configuration.GetConnectionString("Supabase")
               ?? throw new InvalidOperationException("Supabase connection string is not configured.");
    }
}
