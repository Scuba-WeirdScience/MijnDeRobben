using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface ILeningService
{
    Task<IReadOnlyList<MijnLeningDto>> GetMyLeningenAsync(string memberUserId);
    Task<MateriaalLeningStatusDto> GetMateriaalStatusAsync(Guid materiaalId, string memberUserId);
    Task<(MijnLeningDto? Result, string? Error)> TakeAsync(string memberUserId, Guid materiaalId);
    Task<(bool Success, string? Error)> ReturnAsync(Guid leningId, string memberUserId, string? notities);
    Task<IReadOnlyList<LeningDto>> GetAllAsync();
    Task<IReadOnlyList<LeningDto>> GetByMemberIdAsync(Guid memberId);
    Task<IReadOnlyList<LeningDto>> GetByMateriaalIdAsync(Guid materiaalId);
    Task<bool> DeleteAsync(Guid id);
}

public class LeningService(MemberDbContext db) : ILeningService
{
    public async Task<IReadOnlyList<MijnLeningDto>> GetMyLeningenAsync(string memberUserId)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);
        if (member == null) return [];

        return await db.Leningen
            .Where(l => l.MemberId == member.Id && l.Retourdatum == null)
            .Include(l => l.Materiaal).ThenInclude(m => m.MateriaalType)
            .OrderByDescending(l => l.UitgeleendDatum)
            .Select(l => new MijnLeningDto(
                l.Id,
                l.MateriaalId,
                l.Materiaal.Naam,
                l.Materiaal.MateriaalType.Naam,
                l.Materiaal.Serienummer,
                l.UitgeleendDatum,
                l.CreatedAt.ToString("o")
            ))
            .ToListAsync();
    }

    public async Task<MateriaalLeningStatusDto> GetMateriaalStatusAsync(Guid materiaalId, string memberUserId)
    {
        var materiaal = await db.Materialen.Include(m => m.MateriaalType).FirstOrDefaultAsync(m => m.Id == materiaalId);
        if (materiaal == null)
            return new MateriaalLeningStatusDto(false, null, null, null, false, "Materiaal niet gevonden.", null, null);

        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);

        var activeLening = await db.Leningen
            .Where(l => l.MateriaalId == materiaalId && l.Retourdatum == null)
            .FirstOrDefaultAsync();

        bool isMijnLening = member != null && activeLening?.MemberId == member.Id;
        string? huidigeLenerNaam = null;
        if (activeLening != null && !isMijnLening)
        {
            var lener = await db.Members.FindAsync(activeLening.MemberId);
            huidigeLenerNaam = lener != null ? $"{lener.FirstName} {lener.LastName}" : "Onbekend";
        }

        string? message = activeLening != null && !isMijnLening
            ? "Dit materiaal is al uitgeleend."
            : activeLening != null && isMijnLening
                ? "Je hebt dit materiaal al."
                : null;

        return new MateriaalLeningStatusDto(
            activeLening != null,
            activeLening?.Id,
            huidigeLenerNaam,
            activeLening?.UitgeleendDatum,
            isMijnLening,
            message,
            materiaal.Naam,
            materiaal.MateriaalType?.Naam
        );
    }

    public async Task<(MijnLeningDto? Result, string? Error)> TakeAsync(string memberUserId, Guid materiaalId)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);
        if (member == null) return (null, "Lid niet gevonden.");

        var materiaal = await db.Materialen.Include(m => m.MateriaalType).FirstOrDefaultAsync(m => m.Id == materiaalId);
        if (materiaal == null) return (null, "Materiaal niet gevonden.");

        var activeLening = await db.Leningen
            .Where(l => l.MateriaalId == materiaalId && l.Retourdatum == null)
            .FirstOrDefaultAsync();
        if (activeLening != null) return (null, "Dit materiaal is al uitgeleend.");

        var hasThis = await db.Leningen
            .Where(l => l.MateriaalId == materiaalId && l.MemberId == member.Id && l.Retourdatum == null)
            .AnyAsync();
        if (hasThis) return (null, "Je hebt dit materiaal al.");

        if (materiaal.MateriaalType?.MaxLeningenPerLid != null)
        {
            var currentCount = await db.Leningen
                .Where(l => l.MemberId == member.Id && l.Retourdatum == null)
                .Join(db.Materialen, l => l.MateriaalId, m => m.Id, (l, m) => m)
                .Where(m => m.MateriaalTypeId == materiaal.MateriaalTypeId)
                .CountAsync();
            if (currentCount >= materiaal.MateriaalType.MaxLeningenPerLid)
                return (null, $"Je mag maximaal {materiaal.MateriaalType.MaxLeningenPerLid} stuk(s) van dit type lenen.");
        }

        var lening = new MateriaalLening
        {
            MateriaalId = materiaalId,
            MemberId = member.Id,
            UitgeleendDatum = DateOnly.FromDateTime(DateTime.UtcNow),
        };

        materiaal.Actief = true;
        db.Leningen.Add(lening);
        await db.SaveChangesAsync();

        await db.Entry(lening).Reference(l => l.Materiaal).LoadAsync();

        return (new MijnLeningDto(
            lening.Id, lening.MateriaalId, lening.Materiaal.Naam,
            null, null, lening.UitgeleendDatum, lening.CreatedAt.ToString("o")
        ), null);
    }

    public async Task<(bool Success, string? Error)> ReturnAsync(Guid leningId, string memberUserId, string? notities)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);
        if (member == null) return (false, "Lid niet gevonden.");

        var lening = await db.Leningen
            .Where(l => l.Id == leningId && l.Retourdatum == null)
            .FirstOrDefaultAsync();
        if (lening == null) return (false, "Lening niet gevonden.");

        if (lening.MemberId != member.Id) return (false, "Dit is niet jouw lening.");

        lening.Retourdatum = DateOnly.FromDateTime(DateTime.UtcNow);
        if (!string.IsNullOrWhiteSpace(notities)) lening.Notities = notities;

        var materiaal = await db.Materialen.FindAsync(lening.MateriaalId);
        if (materiaal != null) materiaal.Actief = false;

        await db.SaveChangesAsync();
        return (true, null);
    }

    public async Task<IReadOnlyList<LeningDto>> GetAllAsync()
    {
        var leningen = await db.Leningen
            .Include(l => l.Materiaal)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var members = await db.Members.ToListAsync();
        var memberDict = members.ToDictionary(m => m.Id);

        return leningen.Select(l => new LeningDto(
            l.Id,
            l.MateriaalId,
            l.Materiaal.Naam,
            l.MemberId,
            GetMemberDisplay(memberDict, l.MemberId),
            l.UitgeleendDatum,
            l.Retourdatum,
            l.Notities,
            l.CreatedAt.ToString("o")
        )).ToList();
    }

    public async Task<IReadOnlyList<LeningDto>> GetByMemberIdAsync(Guid memberId)
    {
        var leningen = await db.Leningen
            .Include(l => l.Materiaal)
            .Where(l => l.MemberId == memberId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var member = await db.Members.FindAsync(memberId);

        return leningen.Select(l => new LeningDto(
            l.Id,
            l.MateriaalId,
            l.Materiaal.Naam,
            l.MemberId,
            member != null ? new MemberDisplayDto(member.Id, member.FirstName, member.LastName, member.AvatarUrl) : null,
            l.UitgeleendDatum,
            l.Retourdatum,
            l.Notities,
            l.CreatedAt.ToString("o")
        )).ToList();
    }

    public async Task<IReadOnlyList<LeningDto>> GetByMateriaalIdAsync(Guid materiaalId)
    {
        var leningen = await db.Leningen
            .Include(l => l.Materiaal)
            .Where(l => l.MateriaalId == materiaalId)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var memberIds = leningen.Select(l => l.MemberId).Distinct().ToList();
        var members = await db.Members
            .Where(m => memberIds.Contains(m.Id))
            .ToListAsync();
        var memberDict = members.ToDictionary(m => m.Id);

        return leningen.Select(l => new LeningDto(
            l.Id,
            l.MateriaalId,
            l.Materiaal.Naam,
            l.MemberId,
            GetMemberDisplay(memberDict, l.MemberId),
            l.UitgeleendDatum,
            l.Retourdatum,
            l.Notities,
            l.CreatedAt.ToString("o")
        )).ToList();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var lening = await db.Leningen.FindAsync(id);
        if (lening == null) return false;
        if (lening.Retourdatum == null)
        {
            var m = await db.Materialen.FindAsync(lening.MateriaalId);
            if (m != null) m.Actief = false;
        }
        db.Leningen.Remove(lening);
        await db.SaveChangesAsync();
        return true;
    }

    private static MemberDisplayDto? GetMemberDisplay(Dictionary<Guid, Member> dict, Guid memberId)
    {
        if (!dict.TryGetValue(memberId, out var m)) return null;
        return new MemberDisplayDto(m.Id, m.FirstName, m.LastName, m.AvatarUrl);
    }
}
