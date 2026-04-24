using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class BerichtConfiguration : IEntityTypeConfiguration<Bericht>
{
    public void Configure(EntityTypeBuilder<Bericht> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Onderwerp).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Inhoud).IsRequired();
        builder.Property(x => x.IsPinned).HasDefaultValue(false);
        builder.Property(x => x.AangemaaktOp).HasDefaultValueSql("GETUTCDATE()");

        builder.HasOne(x => x.Zender)
            .WithMany()
            .HasForeignKey(x => x.ZenderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(x => x.Lezingen)
            .WithOne(x => x.Bericht)
            .HasForeignKey(x => x.BerichtId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.AangemaaktOp);
        builder.HasIndex(x => x.IsPinned);
    }
}
