using MemberApi.Data;
using MemberApi.DTOs;
using MemberApi.Hubs;
using MemberApi.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Services;

public interface IBerichtService
{
    Task<IReadOnlyList<BerichtSummaryDto>> GetAllAsync(string memberUserId);
    Task<BerichtDetailDto?> GetByIdAsync(Guid id, string memberUserId);
    Task<BerichtSummaryDto> CreateAsync(string memberUserId, CreateBerichtDto dto);
    Task<bool> DeleteAsync(Guid id, string memberUserId, bool isAdmin);
    Task<OnGelezenAantalDto> GetOnGelezenAantalAsync(string memberUserId);
    Task<bool> MarkeerGelezenAsync(Guid id, string memberUserId);
    Task<bool> MarkeerOngelezenAsync(Guid id, string memberUserId);
}

public class BerichtService(MemberDbContext db, IHubContext<BerichtenHub> hub) : IBerichtService
{
    public async Task<IReadOnlyList<BerichtSummaryDto>> GetAllAsync(string memberUserId)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);

        var berichten = await db.Berichten
            .Include(b => b.Zender)
            .Include(b => b.Lezingen)
            .OrderByDescending(b => b.IsPinned)
            .ThenByDescending(b => b.AangemaaktOp)
            .ToListAsync();

        return berichten.Select(b =>
        {
            var isGelezen = member == null || b.Lezingen.Any(l => l.LezerId == member.Id);
            var preview = b.Inhoud.Length > 120 ? b.Inhoud[..120] + "…" : b.Inhoud;

            return new BerichtSummaryDto(
                b.Id,
                b.Onderwerp,
                preview,
                b.IsPinned,
                new MemberDisplayDto(b.Zender.Id, b.Zender.FirstName, b.Zender.LastName, b.Zender.AvatarUrl),
                b.AangemaaktOp.ToString("o"),
                isGelezen
            );
        }).ToList();
    }

    public async Task<BerichtDetailDto?> GetByIdAsync(Guid id, string memberUserId)
    {
        var bericht = await db.Berichten
            .Include(b => b.Zender)
            .Include(b => b.Lezingen)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (bericht == null) return null;

        // Mark as read
        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);
        if (member != null)
        {
            var alreadyRead = bericht.Lezingen.Any(l => l.LezerId == member.Id);
            if (!alreadyRead)
            {
                db.BerichtenLezingen.Add(new BerichtLees
                {
                    BerichtId = bericht.Id,
                    LezerId = member.Id
                });
                await db.SaveChangesAsync();

                // Push updated count only to this user
                await hub.Clients.Group(member.UserId).SendAsync("BerichtenBijgewerkt");
            }
        }

        return new BerichtDetailDto(
            bericht.Id,
            bericht.Onderwerp,
            bericht.Inhoud,
            bericht.IsPinned,
            new MemberDisplayDto(bericht.Zender.Id, bericht.Zender.FirstName, bericht.Zender.LastName, bericht.Zender.AvatarUrl),
            bericht.AangemaaktOp.ToString("o"),
            bericht.BijgewerktOp?.ToString("o")
        );
    }

    public async Task<BerichtSummaryDto> CreateAsync(string memberUserId, CreateBerichtDto dto)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId)
            ?? throw new InvalidOperationException("Lid niet gevonden.");

        var bericht = new Bericht
        {
            ZenderId = member.Id,
            Onderwerp = dto.Onderwerp.Trim(),
            Inhoud = dto.Inhoud.Trim(),
            IsPinned = dto.IsPinned,
        };

        db.Berichten.Add(bericht);

        // Author automatically marks their own bericht as read
        db.BerichtenLezingen.Add(new BerichtLees
        {
            BerichtId = bericht.Id,
            LezerId = member.Id
        });

        await db.SaveChangesAsync();

        // Notify all connected clients that berichten changed
        await hub.Clients.All.SendAsync("BerichtenBijgewerkt");

        var preview = bericht.Inhoud.Length > 120 ? bericht.Inhoud[..120] + "…" : bericht.Inhoud;

        return new BerichtSummaryDto(
            bericht.Id,
            bericht.Onderwerp,
            preview,
            bericht.IsPinned,
            new MemberDisplayDto(member.Id, member.FirstName, member.LastName, member.AvatarUrl),
            bericht.AangemaaktOp.ToString("o"),
            true
        );
    }

    public async Task<bool> DeleteAsync(Guid id, string memberUserId, bool isAdmin)
    {
        var bericht = await db.Berichten
            .Include(b => b.Zender)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (bericht == null) return false;

        if (!isAdmin && bericht.Zender.UserId != memberUserId) return false;

        db.Berichten.Remove(bericht);
        await db.SaveChangesAsync();

        // Notify all connected clients
        await hub.Clients.All.SendAsync("BerichtenBijgewerkt");

        return true;
    }

    public async Task<OnGelezenAantalDto> GetOnGelezenAantalAsync(string memberUserId)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);
        if (member == null) return new OnGelezenAantalDto(0);

        var totalBerichten = await db.Berichten.CountAsync();
        var gelezenAantal = await db.BerichtenLezingen
            .Where(l => l.LezerId == member.Id)
            .CountAsync();

        var ongelezen = Math.Max(0, totalBerichten - gelezenAantal);
        return new OnGelezenAantalDto(ongelezen);
    }

    public async Task<bool> MarkeerGelezenAsync(Guid id, string memberUserId)
    {
        var bericht = await db.Berichten
            .Include(b => b.Lezingen)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (bericht == null) return false;

        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);
        if (member == null) return false;

        var alreadyRead = bericht.Lezingen.Any(l => l.LezerId == member.Id);
        if (!alreadyRead)
        {
            db.BerichtenLezingen.Add(new BerichtLees
            {
                BerichtId = bericht.Id,
                LezerId = member.Id
            });
            await db.SaveChangesAsync();
            await hub.Clients.Group(member.UserId).SendAsync("BerichtenBijgewerkt");
        }

        return true;
    }

    public async Task<bool> MarkeerOngelezenAsync(Guid id, string memberUserId)
    {
        var member = await db.Members.FirstOrDefaultAsync(m => m.UserId == memberUserId);
        if (member == null) return false;

        var lezing = await db.BerichtenLezingen
            .FirstOrDefaultAsync(l => l.BerichtId == id && l.LezerId == member.Id);

        if (lezing == null) return true; // already unread, treat as success

        db.BerichtenLezingen.Remove(lezing);
        await db.SaveChangesAsync();
        await hub.Clients.Group(member.UserId).SendAsync("BerichtenBijgewerkt");

        return true;
    }
}
