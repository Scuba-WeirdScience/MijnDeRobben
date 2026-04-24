using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("members")]
[Authorize]
public class MemberOrganisatiesController(
    IMemberOrganisatieService organisatieService,
    IMemberService memberService) : ControllerBase
{
    // ── "Me" endpoint (all authenticated users) ───────────────────────────────

    /// <summary>Returns the organisatiekoppelingen (with grouped brevetten) for the currently authenticated user.</summary>
    [HttpGet("me/organisaties")]
    public async Task<IActionResult> GetMine()
    {
        var gatewayUserId = GetGatewayUserId();
        if (gatewayUserId is null)
            return Unauthorized(new { error = "Missing user identity." });

        var member = await memberService.GetMeAsync(gatewayUserId);
        if (member is null)
            return NotFound(new { error = "Member record not found." });

        var organisaties = await organisatieService.GetByMemberIdAsync(member.Id);
        return Ok(organisaties);
    }

    // ── Member-scoped endpoints (InstructieKader, Bestuur, Admin) ────────────

    /// <summary>Returns all organisatiekoppelingen for a specific member.</summary>
    [HttpGet("{memberId:guid}/organisaties")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> GetByMember(Guid memberId)
    {
        var organisaties = await organisatieService.GetByMemberIdAsync(memberId);
        return Ok(organisaties);
    }

    /// <summary>Creates a new organisatiekoppeling for a specific member.</summary>
    [HttpPost("{memberId:guid}/organisaties")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Create(Guid memberId, [FromBody] CreateMemberOrganisatieDto dto)
    {
        try
        {
            var result = await organisatieService.CreateAsync(memberId, dto);
            return CreatedAtAction(nameof(GetByMember), new { memberId }, result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    /// <summary>Updates an existing organisatiekoppeling (logboeknummer + begindatum only).</summary>
    [HttpPut("{memberId:guid}/organisaties/{id:guid}")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Update(Guid memberId, Guid id, [FromBody] UpdateMemberOrganisatieDto dto)
    {
        var result = await organisatieService.UpdateAsync(memberId, id, dto);
        return result is null
            ? NotFound(new { error = "Organisatiekoppeling niet gevonden." })
            : Ok(result);
    }

    /// <summary>Deletes an organisatiekoppeling.</summary>
    [HttpDelete("{memberId:guid}/organisaties/{id:guid}")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Delete(Guid memberId, Guid id)
    {
        var deleted = await organisatieService.DeleteAsync(memberId, id);
        return deleted ? NoContent() : NotFound(new { error = "Organisatiekoppeling niet gevonden." });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string? GetGatewayUserId() =>
        User.FindFirst("sub")?.Value
        ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
}
