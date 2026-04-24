using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface IBrevetTypeDefinitionService
{
    Task<IReadOnlyList<BrevetTypeDefinitionDto>> GetAllAsync();
    Task<IReadOnlyList<BrevetTypeDefinitionDto>> GetByOrganisatieAsync(string organisatie);
    Task<BrevetTypeDefinitionDto> CreateAsync(CreateBrevetTypeDefinitionDto dto);
    Task<BrevetTypeDefinitionDto?> UpdateAsync(Guid id, UpdateBrevetTypeDefinitionDto dto);
    Task<bool> DeleteAsync(Guid id);
}

public class BrevetTypeDefinitionService(MemberDbContext db) : IBrevetTypeDefinitionService
{
    public async Task<IReadOnlyList<BrevetTypeDefinitionDto>> GetAllAsync()
    {
        return await db.BrevetTypeDefinitions
            .OrderBy(b => b.Organisatie)
            .ThenBy(b => b.Volgorde)
            .ThenBy(b => b.Naam)
            .Select(b => ToDto(b))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<BrevetTypeDefinitionDto>> GetByOrganisatieAsync(string organisatie)
    {
        return await db.BrevetTypeDefinitions
            .Where(b => b.Organisatie == organisatie)
            .OrderBy(b => b.Volgorde)
            .ThenBy(b => b.Naam)
            .Select(b => ToDto(b))
            .ToListAsync();
    }

    public async Task<BrevetTypeDefinitionDto> CreateAsync(CreateBrevetTypeDefinitionDto dto)
    {
        var entity = new BrevetTypeDefinition
        {
            Organisatie = dto.Organisatie,
            Naam        = dto.Naam,
            Volgorde    = dto.Volgorde,
        };

        db.BrevetTypeDefinitions.Add(entity);
        await db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<BrevetTypeDefinitionDto?> UpdateAsync(Guid id, UpdateBrevetTypeDefinitionDto dto)
    {
        var entity = await db.BrevetTypeDefinitions.FindAsync(id);
        if (entity is null) return null;

        entity.Naam     = dto.Naam;
        entity.Volgorde = dto.Volgorde;

        await db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await db.BrevetTypeDefinitions.FindAsync(id);
        if (entity is null) return false;

        db.BrevetTypeDefinitions.Remove(entity);
        await db.SaveChangesAsync();
        return true;
    }

    private static BrevetTypeDefinitionDto ToDto(BrevetTypeDefinition b) =>
        new(b.Id, b.Organisatie, b.Naam, b.Volgorde);
}
