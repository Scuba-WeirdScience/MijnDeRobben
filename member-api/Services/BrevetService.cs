using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface IBrevetService
{
    Task<IReadOnlyList<BrevetDto>> GetByMemberIdAsync(Guid memberId);
    Task<BrevetDto> CreateAsync(Guid memberId, CreateBrevetDto dto);
    Task<BrevetDto?> UpdateAsync(Guid memberId, Guid brevetId, UpdateBrevetDto dto);
    Task<bool> DeleteAsync(Guid memberId, Guid brevetId);
}

public class BrevetService(MemberDbContext db) : IBrevetService
{
    public async Task<IReadOnlyList<BrevetDto>> GetByMemberIdAsync(Guid memberId)
    {
        return await db.Brevetten
            .Where(b => b.MemberId == memberId)
            .OrderByDescending(b => b.BehaaldDatum)
            .ThenBy(b => b.Organisatie)
            .Select(b => ToDto(b))
            .ToListAsync();
    }

    public async Task<BrevetDto> CreateAsync(Guid memberId, CreateBrevetDto dto)
    {
        var brevet = new Brevet
        {
            MemberId        = memberId,
            BrevetType      = dto.BrevetType,
            Organisatie     = dto.Organisatie,
            OrganisatieNaam = dto.OrganisatieNaam,
            Niveau          = dto.Niveau,
            BehaaldDatum    = dto.BehaaldDatum is not null ? DateOnly.Parse(dto.BehaaldDatum) : null,
            Notities        = dto.Notities,
            CreatedAt       = DateTime.UtcNow,
        };

        db.Brevetten.Add(brevet);
        await db.SaveChangesAsync();
        return ToDto(brevet);
    }

    public async Task<BrevetDto?> UpdateAsync(Guid memberId, Guid brevetId, UpdateBrevetDto dto)
    {
        var brevet = await db.Brevetten
            .FirstOrDefaultAsync(b => b.Id == brevetId && b.MemberId == memberId);

        if (brevet is null) return null;

        brevet.BrevetType       = dto.BrevetType;
        brevet.Organisatie      = dto.Organisatie;
        brevet.OrganisatieNaam  = dto.OrganisatieNaam;
        brevet.Niveau           = dto.Niveau;
        brevet.BehaaldDatum     = dto.BehaaldDatum is not null ? DateOnly.Parse(dto.BehaaldDatum) : null;
        brevet.Notities         = dto.Notities;
        brevet.UpdatedAt        = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(brevet);
    }

    public async Task<bool> DeleteAsync(Guid memberId, Guid brevetId)
    {
        var brevet = await db.Brevetten
            .FirstOrDefaultAsync(b => b.Id == brevetId && b.MemberId == memberId);

        if (brevet is null) return false;

        db.Brevetten.Remove(brevet);
        await db.SaveChangesAsync();
        return true;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static BrevetDto ToDto(Brevet b) => new(
        b.Id,
        b.MemberId,
        b.BrevetType,
        b.Organisatie,
        b.OrganisatieNaam,
        b.Niveau,
        b.BehaaldDatum?.ToString("yyyy-MM-dd"),
        b.Notities,
        b.CreatedAt.ToString("o"),
        b.UpdatedAt?.ToString("o")
    );
}
