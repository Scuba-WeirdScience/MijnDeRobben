using MemberApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MemberApi.Data.Configurations;

public class MateriaalTypeConfiguration : IEntityTypeConfiguration<MateriaalType>
{
    public void Configure(EntityTypeBuilder<MateriaalType> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Naam).IsRequired().HasMaxLength(100);
        builder.Property(m => m.Beschrijving).HasMaxLength(500);
        builder.Property(m => m.Volgorde).HasDefaultValue(0);
        builder.Property(m => m.MaxLeningenPerLid);
        builder.Property(m => m.Huurprijs).HasPrecision(10, 2);
        builder.Property(m => m.CustomProperties).HasColumnType("nvarchar(max)");
        builder.HasIndex(m => m.Naam).IsUnique();

        // Fully specify the one-to-many relationship to prevent duplicate FK column generation
        builder.HasMany(m => m.Materialen)
               .WithOne(m => m.MateriaalType)
               .HasForeignKey(m => m.MateriaalTypeId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
