using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Apps.Backend.Infrastructure.Persistence;

public static class SupabasePersistenceServiceCollectionExtensions
{
    public static IServiceCollection AddSupabasePersistencePlaceholders(this IServiceCollection services)
    {
        services.AddSingleton<IUnitOfWork, NoOpUnitOfWork>();
        services.AddSingleton<AppDbContext>();

        services.AddSingleton<ISupabasePersistencePlaceholder, SupabasePersistencePlaceholder>();

        return services;
    }

    public interface ISupabasePersistencePlaceholder
    {
    }

    private sealed class SupabasePersistencePlaceholder : ISupabasePersistencePlaceholder
    {
        public SupabasePersistencePlaceholder(ILogger<SupabasePersistencePlaceholder> logger)
        {
            logger.LogInformation("Supabase persistence placeholder registered. No real database connection is configured.");
        }
    }
}
