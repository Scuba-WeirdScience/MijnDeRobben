using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class BerichtLeesConfiguration : IEntityTypeConfiguration<BerichtLees>
{
    public void Configure(EntityTypeBuilder<BerichtLees> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.GelezenOp).HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(x => x.Bericht)
            .WithMany(x => x.Lezingen)
            .HasForeignKey(x => x.BerichtId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.Lezer)
            .WithMany()
            .HasForeignKey(x => x.LezerId)
            .OnDelete(DeleteBehavior.NoAction);

        // A member can only read a bericht once
        builder.HasIndex(x => new { x.BerichtId, x.LezerId }).IsUnique();
    }
}
