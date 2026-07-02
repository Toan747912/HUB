using Apps.Backend.Modules.Evidence.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apps.Backend.API.Controllers;

[ApiController]
[Route("api/evidence")]
[Authorize]
public class EvidenceController : ControllerBase
{
    private readonly IEvidenceService _evidenceService;

    public EvidenceController(IEvidenceService evidenceService)
    {
        _evidenceService = evidenceService;
    }

    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateEvidenceRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _evidenceService.CreateEvidenceAsync(request, cancellationToken);
            return Ok(result);
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
            var result = await _evidenceService.GetEvidenceBySessionAsync(sessionId, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
