using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class BrevetConfiguration : IEntityTypeConfiguration<Brevet>
{
    public void Configure(EntityTypeBuilder<Brevet> builder)
    {
        builder.HasKey(b => b.Id);

        builder.Property(b => b.BrevetType).IsRequired().HasMaxLength(20).HasDefaultValue("Brevet");
        builder.Property(b => b.Organisatie).IsRequired().HasMaxLength(50);
        builder.Property(b => b.OrganisatieNaam).HasMaxLength(100).IsRequired(false);
        builder.Property(b => b.Niveau).IsRequired().HasMaxLength(100);
        builder.Property(b => b.Notities).HasMaxLength(500).IsRequired(false);
        builder.Property(b => b.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(b => b.Member)
               .WithMany()
               .HasForeignKey(b => b.MemberId)
               .OnDelete(DeleteBehavior.Cascade);

    }
}
