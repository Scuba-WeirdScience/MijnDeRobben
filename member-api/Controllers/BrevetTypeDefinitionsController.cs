using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("brevet-types")]
[Authorize]
public class BrevetTypeDefinitionsController(IBrevetTypeDefinitionService service) : ControllerBase
{
    /// <summary>Returns all brevet type definitions (all authenticated users).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? organisatie)
    {
        if (!string.IsNullOrEmpty(organisatie))
        {
            var filtered = await service.GetByOrganisatieAsync(organisatie);
            return Ok(filtered);
        }

        var list = await service.GetAllAsync();
        return Ok(list);
    }

    /// <summary>Creates a new brevet type definition (InstructieKader, Bestuur, Admin).</summary>
    [HttpPost]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateBrevetTypeDefinitionDto dto)
    {
        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetAll), result);
    }

    /// <summary>Updates a brevet type definition (InstructieKader, Bestuur, Admin).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBrevetTypeDefinitionDto dto)
    {
        var result = await service.UpdateAsync(id, dto);
        return result is null
            ? NotFound(new { error = "BrevetTypeDefinition not found." })
            : Ok(result);
    }

    /// <summary>Deletes a brevet type definition (InstructieKader, Bestuur, Admin).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound(new { error = "BrevetTypeDefinition not found." });
    }
}
