using Apps.Backend.Modules.Intervention.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apps.Backend.API.Controllers;

[ApiController]
[Route("api/intervention")]
[Authorize]
public class InterventionController : ControllerBase
{
    private readonly IInterventionService _interventionService;

    public InterventionController(IInterventionService interventionService)
    {
        _interventionService = interventionService;
    }

    [HttpPost("apply/{recommendationId:guid}")]
    public async Task<IActionResult> Apply([FromRoute] Guid recommendationId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _interventionService.ApplyAsync(recommendationId, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("session/{sessionId:guid}")]
    public async Task<IActionResult> GetBySession([FromRoute] Guid sessionId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _interventionService.GetBySessionAsync(sessionId, cancellationToken);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
