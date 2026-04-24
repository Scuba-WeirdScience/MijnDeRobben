using System.Text.Json;
using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface IMateriaalTypeService
{
    /// <summary>Returns all types with their materialen grouped together.</summary>
    Task<IReadOnlyList<MateriaalTypeWithMaterialenDto>> GetAllWithMaterialenAsync();

    /// <summary>Returns all types (flat list).</summary>
    Task<IReadOnlyList<MateriaalTypeDto>> GetAllAsync();

    Task<MateriaalTypeDto> CreateAsync(CreateMateriaalTypeDto dto);
    Task<MateriaalTypeDto?> UpdateAsync(Guid id, UpdateMateriaalTypeDto dto);
    Task<bool> DeleteAsync(Guid id);
}

public class MateriaalTypeService(MemberDbContext db) : IMateriaalTypeService
{
    public async Task<IReadOnlyList<MateriaalTypeWithMaterialenDto>> GetAllWithMaterialenAsync()
    {
        // Fetch active lent materiaal IDs (open leningen with no return date)
        var activeLentIds = await db.Leningen
            .Where(l => l.Retourdatum == null)
            .Select(l => l.MateriaalId)
            .ToListAsync();
        var activeSet = new HashSet<Guid>(activeLentIds);

        var types = await db.MateriaalTypes
            .OrderBy(t => t.Volgorde)
            .ThenBy(t => t.Naam)
            .Include(t => t.Materialen.OrderBy(m => m.Naam))
            .ToListAsync();

        return types.Select(t => new MateriaalTypeWithMaterialenDto(
            t.Id,
            t.Naam,
            t.Beschrijving,
            t.Volgorde,
            t.MaxLeningenPerLid,
            t.Huurprijs,
            DeserializeCustomProperties(t.CustomProperties),
            t.Materialen.Select(m => ToMateriaalDto(m, activeSet.Contains(m.Id))).ToList(),
            t.CreatedAt.ToString("o"),
            t.UpdatedAt?.ToString("o")
        )).ToList();
    }

    public async Task<IReadOnlyList<MateriaalTypeDto>> GetAllAsync()
    {
        return await db.MateriaalTypes
            .OrderBy(t => t.Volgorde)
            .ThenBy(t => t.Naam)
            .Select(t => ToDto(t))
            .ToListAsync();
    }

    public async Task<MateriaalTypeDto> CreateAsync(CreateMateriaalTypeDto dto)
    {
        var entity = new MateriaalType
        {
            Naam            = dto.Naam,
            Beschrijving   = dto.Beschrijving,
            Volgorde       = dto.Volgorde ?? 0,
            MaxLeningenPerLid = dto.MaxLeningenPerLid,
            Huurprijs      = dto.Huurprijs,
            CustomProperties = SerializeCustomProperties(dto.CustomProperties),
        };

        db.MateriaalTypes.Add(entity);
        await db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<MateriaalTypeDto?> UpdateAsync(Guid id, UpdateMateriaalTypeDto dto)
    {
        var entity = await db.MateriaalTypes.FindAsync(id);
        if (entity is null) return null;

        if (dto.Naam is not null) entity.Naam = dto.Naam;
        if (dto.Beschrijving is not null) entity.Beschrijving = dto.Beschrijving;
        if (dto.Volgorde.HasValue) entity.Volgorde = dto.Volgorde.Value;
        if (dto.MaxLeningenPerLid.HasValue) entity.MaxLeningenPerLid = dto.MaxLeningenPerLid;
        if (dto.Huurprijs.HasValue) entity.Huurprijs = dto.Huurprijs;
        if (dto.CustomProperties is not null) entity.CustomProperties = SerializeCustomProperties(dto.CustomProperties);
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(entity);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var entity = await db.MateriaalTypes.FindAsync(id);
        if (entity is null) return false;

        db.MateriaalTypes.Remove(entity);
        await db.SaveChangesAsync();
        return true;
    }

    private static MateriaalTypeDto ToDto(MateriaalType t) => new(
        t.Id,
        t.Naam,
        t.Beschrijving,
        t.Volgorde,
        t.MaxLeningenPerLid,
        t.Huurprijs,
        DeserializeCustomProperties(t.CustomProperties),
        t.CreatedAt.ToString("o"),
        t.UpdatedAt?.ToString("o")
    );

    private static MateriaalDto ToMateriaalDto(Materiaal m, bool actief) => new(
        m.Id,
        m.MateriaalTypeId,
        m.Naam,
        m.Serienummer,
        m.Notities,
        m.AankoopDatum?.ToString("yyyy-MM-dd"),
        actief,
        DeserializeMateriaalCustomProperties(m.CustomProperties),
        m.CreatedAt.ToString("o"),
        m.UpdatedAt?.ToString("o")
    );

    private static IReadOnlyList<CustomPropertyDef>? DeserializeCustomProperties(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<IReadOnlyList<CustomPropertyDef>>(json);
        }
        catch { return null; }
    }

    private static string? SerializeCustomProperties(IReadOnlyList<CustomPropertyDef>? props)
    {
        if (props == null || props.Count == 0) return null;
        return JsonSerializer.Serialize(props);
    }

    private static Dictionary<string, string>? DeserializeMateriaalCustomProperties(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json);
        }
        catch { return null; }
    }
}
