using MemberApi.DTOs;
using MemberApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MemberApi.Controllers;

[ApiController]
[Route("materialen")]
[Authorize]
public class MaterialenController(IMateriaalService service) : ControllerBase
{
    /// <summary>Returns all materialen for a specific type.</summary>
    [HttpGet]
    public async Task<IActionResult> GetByType([FromQuery] Guid typeId)
    {
        if (typeId == Guid.Empty)
            return BadRequest(new { error = "typeId is required." });

        var list = await service.GetByTypeAsync(typeId);
        return Ok(list);
    }

    /// <summary>Creates a new materiaal item.</summary>
    [HttpPost]
    [Authorize(Roles = "MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateMateriaalDto dto)
    {
        var result = await service.CreateAsync(dto);
        return CreatedAtAction(nameof(GetByType), new { typeId = dto.MateriaalTypeId }, result);
    }

    /// <summary>Updates an existing materiaal item.</summary>
    [HttpPut("{typeId:guid}/{id:guid}")]
    [Authorize(Roles = "MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> Update(Guid typeId, Guid id, [FromBody] UpdateMateriaalDto dto)
    {
        var result = await service.UpdateAsync(typeId, id, dto);
        return result is null
            ? NotFound(new { error = "Materiaal not found." })
            : Ok(result);
    }

    /// <summary>Deletes a materiaal item.</summary>
    [HttpDelete("{typeId:guid}/{id:guid}")]
    [Authorize(Roles = "MateriaalCommissie,Bestuur,Admin")]
    public async Task<IActionResult> Delete(Guid typeId, Guid id)
    {
        var deleted = await service.DeleteAsync(typeId, id);
        return deleted ? NoContent() : NotFound(new { error = "Materiaal not found." });
    }
}
