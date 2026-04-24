using MemberApi.Models;
using Microsoft.EntityFrameworkCore;

namespace MemberApi.Data;

public class MemberDbContext(DbContextOptions<MemberDbContext> options) : DbContext(options)
{
    public DbSet<Member> Members => Set<Member>();
    public DbSet<Brevet> Brevetten => Set<Brevet>();
    public DbSet<SpecialtyType> SpecialtyTypes => Set<SpecialtyType>();
    public DbSet<BrevetTypeDefinition> BrevetTypeDefinitions => Set<BrevetTypeDefinition>();
    public DbSet<MemberOrganisatie> MemberOrganisaties => Set<MemberOrganisatie>();
    public DbSet<MateriaalType> MateriaalTypes => Set<MateriaalType>();
    public DbSet<Materiaal> Materialen => Set<Materiaal>();
    public DbSet<MateriaalLening> Leningen => Set<MateriaalLening>();
    public DbSet<Bericht> Berichten => Set<Bericht>();
    public DbSet<BerichtLees> BerichtenLezingen => Set<BerichtLees>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(MemberDbContext).Assembly);
    }
}
