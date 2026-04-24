using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("specialty-types")]
[Authorize]
public class SpecialtyTypesController(ISpecialtyTypeService service) : ControllerBase
{
    /// <summary>Returns all specialty types (all authenticated users).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await service.GetAllAsync();
        return Ok(list);
    }

    /// <summary>Returns specialty types for a specific organisation.</summary>
    [HttpGet("{organisatie}")]
    public async Task<IActionResult> GetByOrganisatie(string organisatie)
    {
        var list = await service.GetByOrganisatieAsync(organisatie);
        return Ok(list);
    }

    /// <summary>Creates a new specialty type (InstructieKader, Bestuur, Admin).</summary>
    [HttpPost]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateSpecialtyTypeDto dto)
    {
        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetAll), result);
    }

    /// <summary>Updates a specialty type (InstructieKader, Bestuur, Admin).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSpecialtyTypeDto dto)
    {
        var result = await service.UpdateAsync(id, dto);
        return result is null
            ? NotFound(new { error = "SpecialtyType not found." })
            : Ok(result);
    }

    /// <summary>Deletes a specialty type (InstructieKader, Bestuur, Admin).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "InstructieKader,Bestuur,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound(new { error = "SpecialtyType not found." });
    }
}
