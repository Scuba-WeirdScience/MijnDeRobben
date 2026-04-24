using MemberApi.Data;
using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Data.Seed;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(MemberDbContext context)
    {
        await context.Database.MigrateAsync();

        await SeedSpecialtyTypesAsync(context);
        await SeedJanBrevettenAsync(context);
    }

    // ── SpecialtyTypes ────────────────────────────────────────────────────────
    private static async Task SeedSpecialtyTypesAsync(MemberDbContext context)
    {
        if (await context.SpecialtyTypes.AnyAsync()) return;

        var specialtyTypes = new List<SpecialtyType>
        {
            // NOB specialiteiten
            new() { Organisatie = "NOB", Naam = "Droogpakduiken",      Volgorde = 1 },
            new() { Organisatie = "NOB", Naam = "Redden",              Volgorde = 2 },
            new() { Organisatie = "NOB", Naam = "Nitrox",              Volgorde = 3 },
            new() { Organisatie = "NOB", Naam = "Wrakduiken",          Volgorde = 4 },
            new() { Organisatie = "NOB", Naam = "Navigatie",           Volgorde = 5 },
            new() { Organisatie = "NOB", Naam = "Onderwaterfotografie",Volgorde = 6 },
            new() { Organisatie = "NOB", Naam = "Diepduiken",          Volgorde = 7 },

            // CMAS specialiteiten
            new() { Organisatie = "CMAS", Naam = "Nitrox",              Volgorde = 1 },
            new() { Organisatie = "CMAS", Naam = "Droogpakduiken",      Volgorde = 2 },
            new() { Organisatie = "CMAS", Naam = "Wrakduiken",          Volgorde = 3 },
            new() { Organisatie = "CMAS", Naam = "Navigatie",           Volgorde = 4 },
            new() { Organisatie = "CMAS", Naam = "Diepduiken",          Volgorde = 5 },

            // PADI specialiteiten
            new() { Organisatie = "PADI", Naam = "Nitrox",              Volgorde = 1 },
            new() { Organisatie = "PADI", Naam = "Droogpakduiken",      Volgorde = 2 },
            new() { Organisatie = "PADI", Naam = "Wrakduiken",          Volgorde = 3 },
            new() { Organisatie = "PADI", Naam = "Onderwaterfotografie",Volgorde = 4 },
            new() { Organisatie = "PADI", Naam = "Diepduiken",          Volgorde = 5 },

            // SSI specialiteiten
            new() { Organisatie = "SSI", Naam = "Nitrox",               Volgorde = 1 },
            new() { Organisatie = "SSI", Naam = "Droogpakduiken",       Volgorde = 2 },
            new() { Organisatie = "SSI", Naam = "Wrakduiken",           Volgorde = 3 },
            new() { Organisatie = "SSI", Naam = "Diepduiken",           Volgorde = 4 },
        };

        context.SpecialtyTypes.AddRange(specialtyTypes);
        await context.SaveChangesAsync();
    }

    // ── Brevetten voor de eerste ingelogde gebruiker (Jan De Vos) ──────────
    // Seed enkel als er nog geen brevetten bestaan. De MemberId wordt
    // opgezocht op basis van de gekende gebruikersnaam zodat dit correct
    // werkt na een fresh setup waarbij de gebruiker al ingelogd is geweest.
    private static async Task SeedJanBrevettenAsync(MemberDbContext context)
    {
        if (await context.Brevetten.AnyAsync()) return;

        // Zoek de member gekoppeld aan admin@example.com via UserId.
        // UserId in Members == ApplicationUser.Id uit de gateway-db.
        // Na de eerste login is dit de enige member in de tabel.
        var member = await context.Members.FirstOrDefaultAsync();
        if (member is null) return;

        var brevetten = new List<Brevet>
        {
            new() {
                MemberId    = member.Id,
                Organisatie = "NOB",
                Niveau      = "Niveau 1",
                BrevetType  = "Brevet"
            },
            new() {
                MemberId    = member.Id,
                Organisatie = "NOB",
                Niveau      = "Niveau 2",
                BrevetType  = "Brevet"
            },
            new() {
                MemberId    = member.Id,
                Organisatie = "NOB",
                Niveau      = "Niveau 3",
                BrevetType  = "Brevet"
            },
            new() {
                MemberId    = member.Id,
                Organisatie = "NOB",
                Niveau      = "Redden",
                BrevetType  = "Specialiteit"
            },
            new() {
                MemberId    = member.Id,
                Organisatie = "NOB",
                Niveau      = "Droogpakduiken",
                BrevetType  = "Specialiteit"
            },
        };

        context.Brevetten.AddRange(brevetten);
        await context.SaveChangesAsync();
    }
}
