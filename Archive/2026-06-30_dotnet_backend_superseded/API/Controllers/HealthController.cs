using Apps.Backend.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Apps.Backend.API.Controllers;

[ApiController]
[Route("api/health")]
public sealed class HealthController : ControllerBase
{
    private readonly PersistenceOptions _persistenceOptions;

    public HealthController(IOptions<PersistenceOptions> persistenceOptions)
    {
        _persistenceOptions = persistenceOptions.Value;
    }

    [HttpGet]
    public IActionResult Get()
    {
        var mode = _persistenceOptions.GetModeOrDefault();

        return Ok(new
        {
            status = "ok",
            modulesLoaded = true,
            authStatus = "enabled",
            persistenceMode = mode.ToString().ToLowerInvariant()
        });
    }
}
