using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("materiaal-types")]
[Authorize]
public class MateriaalTypesController(IMateriaalTypeService service) : ControllerBase
{
    /// <summary>Returns all types with their materialen grouped together.</summary>
    [HttpGet("with-materialen")]
    public async Task<IActionResult> GetAllWithMaterialen()
    {
        var list = await service.GetAllWithMaterialenAsync();
        return Ok(list);
    }

    /// <summary>Returns all types (flat list).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var list = await service.GetAllAsync();
        return Ok(list);
    }

    /// <summary>Creates a new materiaal type.</summary>
    [HttpPost]
    [Authorize(Roles = "MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMateriaalTypeDto dto)
    {
        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetAll), result);
    }

    /// <summary>Updates a materiaal type.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMateriaalTypeDto dto)
    {
        var result = await service.UpdateAsync(id, dto);
        return result is null
            ? NotFound(new { error = "MateriaalType not found." })
            : Ok(result);
    }

    /// <summary>Deletes a materiaal type (cascades to materialen).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await service.DeleteAsync(id);
        return deleted ? NoContent() : NotFound(new { error = "MateriaalType not found." });
    }
}
