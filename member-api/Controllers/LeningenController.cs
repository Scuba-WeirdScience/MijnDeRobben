using System.Security.Claims;
using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("leningen")]
[Authorize]
public class LeningenController(ILeningService service) : ControllerBase
{
    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";

    [HttpGet("mijn")]
    public async Task<IActionResult> GetMyLeningen()
        => Ok(await service.GetMyLeningenAsync(GetUserId()));

    [HttpGet("materiaal/{id:guid}")]
    public async Task<IActionResult> GetMateriaalStatus(Guid id)
        => Ok(await service.GetMateriaalStatusAsync(id, GetUserId()));

    [HttpPost("take")]
    public async Task<IActionResult> Take([FromBody] TakeLeningDto dto)
    {
        var (result, error) = await service.TakeAsync(GetUserId(), dto.MateriaalId);
        if (error != null) return BadRequest(new { error });
        return Ok(result);
    }

    [HttpPost("return/{id:guid}")]
    public async Task<IActionResult> Return(Guid id, [FromBody] ReturnLeningDto dto)
    {
        var (success, error) = await service.ReturnAsync(id, GetUserId(), dto.Notities);
        if (!success) return BadRequest(new { error });
        return Ok(new { message = "Materiaal succesvol geretourneerd." });
    }

    [HttpGet]
    [Authorize(Roles = "MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> GetAll()
        => Ok(await service.GetAllAsync());

    [HttpGet("member/{memberId:guid}")]
    [Authorize(Roles = "Beheer,Bestuur,Admin,MateriaalCommissie")]
    public async Task<IActionResult> GetByMember(Guid memberId)
        => Ok(await service.GetByMemberIdAsync(memberId));

    [HttpGet("materiaal/{id:guid}/history")]
    [Authorize(Roles = "Beheer,MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> GetMateriaalHistory(Guid id)
        => Ok(await service.GetByMateriaalIdAsync(id));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> Delete(Guid id)
        => await service.DeleteAsync(id) ? NoContent() : NotFound();
}
