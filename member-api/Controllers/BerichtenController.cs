using System.Security.Claims;
using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("berichten")]
[Authorize]
public class BerichtenController(IBerichtService service) : ControllerBase
{
    private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
    private bool IsAdmin() => User.IsInRole("Beheer") || User.IsInRole("Bestuur") || User.IsInRole("Admin");

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await service.GetAllAsync(GetUserId()));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id, GetUserId());
        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBerichtDto dto)
    {
        try
        {
            var result = await service.CreateAsync(GetUserId(), dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id, GetUserId(), IsAdmin());
        return success ? NoContent() : NotFound();
    }

    [HttpGet("ongelezen-aantal")]
    public async Task<IActionResult> GetOnGelezenAantal()
        => Ok(await service.GetOnGelezenAantalAsync(GetUserId()));

    [HttpPatch("{id:guid}/markeer-gelezen")]
    public async Task<IActionResult> MarkeerGelezen(Guid id)
    {
        var success = await service.MarkeerGelezenAsync(id, GetUserId());
        return success ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/markeer-ongelezen")]
    public async Task<IActionResult> MarkeerOngelezen(Guid id)
    {
        var success = await service.MarkeerOngelezenAsync(id, GetUserId());
        return success ? NoContent() : NotFound();
    }
}
