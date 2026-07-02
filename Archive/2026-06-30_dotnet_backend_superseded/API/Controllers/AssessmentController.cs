using Apps.Backend.Modules.Assessment.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apps.Backend.API.Controllers;

[ApiController]
[Route("api/assessment")]
[Authorize]
public class AssessmentController : ControllerBase
{
    private readonly IAssessmentService _assessmentService;

    public AssessmentController(IAssessmentService assessmentService)
    {
        _assessmentService = assessmentService;
    }

    [HttpPost("run/{sessionId:guid}")]
    public async Task<IActionResult> Run([FromRoute] Guid sessionId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _assessmentService.RunAsync(sessionId, cancellationToken);
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
            var result = await _assessmentService.GetBySessionAsync(sessionId, cancellationToken);
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
