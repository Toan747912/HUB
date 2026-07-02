using Apps.Backend.Modules.Knowledge.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Apps.Backend.API.Controllers;

[ApiController]
[Route("api/knowledge")]
[Authorize]
public class KnowledgeController : ControllerBase
{
    private readonly IKnowledgeService _knowledgeService;

    public KnowledgeController(IKnowledgeService knowledgeService)
    {
        _knowledgeService = knowledgeService;
    }

    [HttpPost("node")]
    public async Task<IActionResult> CreateNode([FromBody] CreateKnowledgeNodeRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _knowledgeService.CreateNodeAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("link")]
    public async Task<IActionResult> LinkNode([FromBody] LinkKnowledgeNodeRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await _knowledgeService.LinkNodesAsync(request, cancellationToken);
            return Ok(new { message = "Knowledge nodes linked successfully." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("node/{id:guid}")]
    public async Task<IActionResult> GetNode([FromRoute] Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _knowledgeService.GetNodeAsync(id, cancellationToken);
            if (result is null)
            {
                return BadRequest(new { message = "Knowledge node not found." });
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
