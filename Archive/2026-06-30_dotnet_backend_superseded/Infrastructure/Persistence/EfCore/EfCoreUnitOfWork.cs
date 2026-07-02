using Apps.Backend.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Apps.Backend.Infrastructure.Persistence.EfCore;

public sealed class EfCoreUnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _dbContext;

    public EfCoreUnitOfWork(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
