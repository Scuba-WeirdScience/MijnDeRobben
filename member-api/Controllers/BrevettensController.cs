using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("members")]
[Authorize]
public class BrevettensController(
    IBrevetService brevetService,
    IMemberService memberService) : ControllerBase
{
    // ── "Me" endpoint (all authenticated users) ───────────────────────────────

    /// <summary>Returns the brevetten for the currently authenticated user.</summary>
    [HttpGet("me/brevetten")]
    public async Task<IActionResult> GetMine()
    {
        var gatewayUserId = GetGatewayUserId();
        if (gatewayUserId is null)
            return Unauthorized(new { error = "Missing user identity." });

        var member = await memberService.GetMeAsync(gatewayUserId);
        if (member is null)
            return NotFound(new { error = "Member record not found." });

        var brevetten = await brevetService.GetByMemberIdAsync(member.Id);
        return Ok(brevetten);
    }

    // ── Member-scoped endpoints (InstructieKader, Bestuur, Admin) ────────────

    /// <summary>Returns all brevetten for a specific member.</summary>
    [HttpGet("{memberId:guid}/brevetten")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> GetByMember(Guid memberId)
    {
        var brevetten = await brevetService.GetByMemberIdAsync(memberId);
        return Ok(brevetten);
    }

    /// <summary>Creates a new brevet for a specific member.</summary>
    [HttpPost("{memberId:guid}/brevetten")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Create(Guid memberId, [FromBody] CreateBrevetDto dto)
    {
        var brevet = await brevetService.CreateAsync(memberId, dto);
        return CreatedAtAction(nameof(GetByMember), new { memberId }, brevet);
    }

    /// <summary>Updates an existing brevet.</summary>
    [HttpPut("{memberId:guid}/brevetten/{id:guid}")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Update(Guid memberId, Guid id, [FromBody] UpdateBrevetDto dto)
    {
        var brevet = await brevetService.UpdateAsync(memberId, id, dto);
        return brevet is null
            ? NotFound(new { error = "Brevet not found." })
            : Ok(brevet);
    }

    /// <summary>Deletes a brevet.</summary>
    [HttpDelete("{memberId:guid}/brevetten/{id:guid}")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Delete(Guid memberId, Guid id)
    {
        var deleted = await brevetService.DeleteAsync(memberId, id);
        return deleted ? NoContent() : NotFound(new { error = "Brevet not found." });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string? GetGatewayUserId() =>
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
}
