using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface IMemberOrganisatieService
{
    Task<IReadOnlyList<MemberOrganisatieDto>> GetByMemberIdAsync(Guid memberId);
    Task<MemberOrganisatieDto> CreateAsync(Guid memberId, CreateMemberOrganisatieDto dto);
    Task<MemberOrganisatieDto?> UpdateAsync(Guid memberId, Guid id, UpdateMemberOrganisatieDto dto);
    Task<bool> DeleteAsync(Guid memberId, Guid id);
}

public class MemberOrganisatieService(MemberDbContext db) : IMemberOrganisatieService
{
    public async Task<IReadOnlyList<MemberOrganisatieDto>> GetByMemberIdAsync(Guid memberId)
    {
        var orgKaarten = await db.MemberOrganisaties
            .Where(mo => mo.MemberId == memberId)
            .OrderBy(mo => mo.Organisatie)
            .ToListAsync();

        // Fetch all brevetten for this member in one query, then group in memory
        var brevetten = await db.Brevetten
            .Where(b => b.MemberId == memberId)
            .OrderBy(b => b.BrevetType)
            .ThenByDescending(b => b.BehaaldDatum)
            .ToListAsync();

        var brevettenByOrg = brevetten
            .GroupBy(b => b.Organisatie)
            .ToDictionary(g => g.Key, g => g.ToList());

        return orgKaarten
            .Select(mo => ToDto(mo, brevettenByOrg.GetValueOrDefault(mo.Organisatie) ?? []))
            .ToList();
    }

    public async Task<MemberOrganisatieDto> CreateAsync(Guid memberId, CreateMemberOrganisatieDto dto)
    {
        var mo = new MemberOrganisatie
        {
            MemberId       = memberId,
            Organisatie    = dto.Organisatie,
            Logboeknummer  = dto.Logboeknummer,
            BeginDatum     = dto.BeginDatum is not null ? DateOnly.Parse(dto.BeginDatum) : null,
            CreatedAt      = DateTime.UtcNow,
        };

        db.MemberOrganisaties.Add(mo);
        await db.SaveChangesAsync();

        var brevetten = await db.Brevetten
            .Where(b => b.MemberId == memberId && b.Organisatie == mo.Organisatie)
            .OrderBy(b => b.BrevetType)
            .ThenByDescending(b => b.BehaaldDatum)
            .ToListAsync();

        return ToDto(mo, brevetten);
    }

    public async Task<MemberOrganisatieDto?> UpdateAsync(Guid memberId, Guid id, UpdateMemberOrganisatieDto dto)
    {
        var mo = await db.MemberOrganisaties
            .FirstOrDefaultAsync(mo => mo.Id == id && mo.MemberId == memberId);

        if (mo is null) return null;

        mo.Logboeknummer = dto.Logboeknummer;
        mo.BeginDatum    = dto.BeginDatum is not null ? DateOnly.Parse(dto.BeginDatum) : null;
        mo.UpdatedAt     = DateTime.UtcNow;

        await db.SaveChangesAsync();

        var brevetten = await db.Brevetten
            .Where(b => b.MemberId == memberId && b.Organisatie == mo.Organisatie)
            .OrderBy(b => b.BrevetType)
            .ThenByDescending(b => b.BehaaldDatum)
            .ToListAsync();

        return ToDto(mo, brevetten);
    }

    public async Task<bool> DeleteAsync(Guid memberId, Guid id)
    {
        var mo = await db.MemberOrganisaties
            .FirstOrDefaultAsync(mo => mo.Id == id && mo.MemberId == memberId);

        if (mo is null) return false;

        db.MemberOrganisaties.Remove(mo);
        await db.SaveChangesAsync();
        return true;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static MemberOrganisatieDto ToDto(MemberOrganisatie mo, List<Brevet> brevetten) => new(
        mo.Id,
        mo.MemberId,
        mo.Organisatie,
        mo.Logboeknummer,
        mo.BeginDatum?.ToString("yyyy-MM-dd"),
        mo.CreatedAt.ToString("o"),
        mo.UpdatedAt?.ToString("o"),
        brevetten.Select(b => new BrevetSummaryDto(
            b.Id,
            b.BrevetType,
            b.Niveau,
            b.BehaaldDatum?.ToString("yyyy-MM-dd"),
            b.Notities
        )).ToList()
    );
}
