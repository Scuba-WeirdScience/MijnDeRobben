using System.Text.Json;
using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface IMateriaalService
{
    Task<IReadOnlyList<MateriaalDto>> GetByTypeAsync(Guid materiaalTypeId);
    Task<MateriaalDto> CreateAsync(CreateMateriaalDto dto);
    Task<MateriaalDto?> UpdateAsync(Guid typeId, Guid id, UpdateMateriaalDto dto);
    Task<bool> DeleteAsync(Guid typeId, Guid id);
}

public class MateriaalService(MemberDbContext db) : IMateriaalService
{
    public async Task<IReadOnlyList<MateriaalDto>> GetByTypeAsync(Guid materiaalTypeId)
    {
        var activeLentIds = await db.Leningen
            .Where(l => l.Retourdatum == null)
            .Select(l => l.MateriaalId)
            .ToListAsync();
        var activeSet = new HashSet<Guid>(activeLentIds);

        return await db.Materialen
            .Where(m => m.MateriaalTypeId == materiaalTypeId)
            .OrderBy(m => m.Naam)
            .ToListAsync()
            .ContinueWith(t => t.Result
                .Select(m => ToDto(m, activeSet.Contains(m.Id)))
                .ToList());
    }

    public async Task<MateriaalDto> CreateAsync(CreateMateriaalDto dto)
    {
        var entity = new Materiaal
        {
            MateriaalTypeId = dto.MateriaalTypeId,
            Naam            = dto.Naam,
            Serienummer     = dto.Serienummer,
            Notities        = dto.Notities,
            AankoopDatum    = dto.AankoopDatum is not null ? DateOnly.Parse(dto.AankoopDatum) : null,
            CustomProperties = SerializeCustomProperties(dto.CustomProperties),
        };

        db.Materialen.Add(entity);
        await db.SaveChangesAsync();
        return ToDto(entity, false);
    }

    public async Task<MateriaalDto?> UpdateAsync(Guid typeId, Guid id, UpdateMateriaalDto dto)
    {
        var entity = await db.Materialen
            .FirstOrDefaultAsync(m => m.Id == id && m.MateriaalTypeId == typeId);

        if (entity is null) return null;

        if (dto.Naam is not null) entity.Naam = dto.Naam;
        if (dto.Serienummer is not null) entity.Serienummer = dto.Serienummer;
        if (dto.Notities is not null) entity.Notities = dto.Notities;
        if (dto.AankoopDatum is not null) entity.AankoopDatum = DateOnly.Parse(dto.AankoopDatum);
        if (dto.CustomProperties is not null) entity.CustomProperties = SerializeCustomProperties(dto.CustomProperties);
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        // Re-check lending status for the response
        var isActief = await db.Leningen.AnyAsync(l => l.MateriaalId == id && l.Retourdatum == null);
        return ToDto(entity, isActief);
    }

    public async Task<bool> DeleteAsync(Guid typeId, Guid id)
    {
        var entity = await db.Materialen
            .FirstOrDefaultAsync(m => m.Id == id && m.MateriaalTypeId == typeId);

        if (entity is null) return false;

        db.Materialen.Remove(entity);
        await db.SaveChangesAsync();
        return true;
    }

    private static MateriaalDto ToDto(Materiaal m, bool actief) => new(
        m.Id,
        m.MateriaalTypeId,
        m.Naam,
        m.Serienummer,
        m.Notities,
        m.AankoopDatum?.ToString("yyyy-MM-dd"),
        actief,
        DeserializeCustomProperties(m.CustomProperties),
        m.CreatedAt.ToString("o"),
        m.UpdatedAt?.ToString("o")
    );

    private static Dictionary<string, string>? DeserializeCustomProperties(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(json);
        }
        catch { return null; }
    }

    private static string? SerializeCustomProperties(Dictionary<string, string>? props)
    {
        if (props == null || props.Count == 0) return null;
        return JsonSerializer.Serialize(props);
    }
}
