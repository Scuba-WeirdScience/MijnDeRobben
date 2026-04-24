using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface ISpecialtyTypeService
{
    Task<IReadOnlyList<SpecialtyTypeDto>> GetAllAsync();
    Task<IReadOnlyList<SpecialtyTypeDto>> GetByOrganisatieAsync(string organisatie);
    Task<SpecialtyTypeDto> CreateAsync(CreateSpecialtyTypeDto dto);
    Task<SpecialtyTypeDto?> UpdateAsync(Guid id, UpdateSpecialtyTypeDto dto);
    Task<bool> DeleteAsync(Guid id);
}

public class SpecialtyTypeService(MemberDbContext db) : ISpecialtyTypeService
{
    public async Task<IReadOnlyList<SpecialtyTypeDto>> GetAllAsync()
    {
        return await db.SpecialtyTypes
            .OrderBy(s => s.Organisatie)
            .ThenBy(s => s.Volgorde)
            .ThenBy(s => s.Naam)
            .Select(s => ToDto(s))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<SpecialtyTypeDto>> GetByOrganisatieAsync(string organisatie)
    {
        return await db.SpecialtyTypes
            .Where(s => s.Organisatie == organisatie)
            .OrderBy(s => s.Volgorde)
            .ThenBy(s => s.Naam)
            .Select(s => ToDto(s))
            .ToListAsync();
    }

    public async Task<SpecialtyTypeDto> CreateAsync(CreateSpecialtyTypeDto dto)
    {
        var entity = new SpecialtyType
        {
            Organisatie = dto.Organisatie,
            Naam        = dto.Naam,
            Volgorde    = dto.Volgorde,
        };

        db.SpecialtyTypes.Add(entity);
        await db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<SpecialtyTypeDto?> UpdateAsync(Guid id, UpdateSpecialtyTypeDto dto)
    {
        var entity = await db.SpecialtyTypes.FindAsync(id);
        if (entity is null) return null;

        entity.Naam     = dto.Naam;
        entity.Volgorde = dto.Volgorde;

        await db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await db.SpecialtyTypes.FindAsync(id);
        if (entity is null) return false;

        db.SpecialtyTypes.Remove(entity);
        await db.SaveChangesAsync();
        return true;
    }

    private static SpecialtyTypeDto ToDto(SpecialtyType s) =>
        new(s.Id, s.Organisatie, s.Naam, s.Volgorde);
}
