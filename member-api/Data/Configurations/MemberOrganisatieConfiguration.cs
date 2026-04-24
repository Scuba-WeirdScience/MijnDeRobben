using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class MemberOrganisatieConfiguration : IEntityTypeConfiguration<MemberOrganisatie>
{
    public void Configure(EntityTypeBuilder<MemberOrganisatie> builder)
    {
        builder.HasKey(mo => mo.Id);

        builder.Property(mo => mo.Organisatie)
               .IsRequired()
               .HasMaxLength(50);

        builder.Property(mo => mo.Logboeknummer)
               .HasMaxLength(100)
               .IsRequired(false);

        builder.Property(mo => mo.CreatedAt)
               .HasDefaultValueSql("GETUTCDATE()");

        // A member can have at most one entry per organisation
        builder.HasIndex(mo => new { mo.MemberId, mo.Organisatie })
               .IsUnique();

        builder.HasOne(mo => mo.Member)
               .WithMany()
               .HasForeignKey(mo => mo.MemberId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
